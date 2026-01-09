'use server'

import 'server-only'

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createSafeBillingError } from '../lib/error-handler'
import { STRIPE_PRICE_IDS, HOTSURE_PACK_QUANTITY } from '../constants'
import type { BillingResult, CheckoutResult } from '../types'

// 遅延初期化（ビルド時のエラー回避）
function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  })
}

/**
 * サブスクリプション用Checkout Session作成
 */
export async function createCheckoutSession(
  planType: 'premium_monthly' | 'premium_yearly'
): Promise<BillingResult<CheckoutResult>> {
  try {
    const stripe = getStripeClient()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        ok: false,
        error: createSafeBillingError('UNAUTHORIZED'),
      }
    }

    // 既存のサブスクリプションを確認
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, plan_type')
      .eq('user_id', user.id)
      .single()

    // 既にプレミアムの場合はエラー
    if (subscription?.plan_type !== 'free' && subscription?.plan_type !== null) {
      return {
        ok: false,
        error: createSafeBillingError('SUBSCRIPTION_EXISTS'),
      }
    }

    const priceId =
      planType === 'premium_monthly'
        ? STRIPE_PRICE_IDS.PREMIUM_MONTHLY
        : STRIPE_PRICE_IDS.PREMIUM_YEARLY

    if (!priceId) {
      return {
        ok: false,
        error: createSafeBillingError('STRIPE_ERROR'),
      }
    }

    // Stripe Customer取得または作成
    let customerId = subscription?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // subscriptionsテーブル更新
      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_type: 'free',
        status: 'active',
      })
    }

    // Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/social?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/social?checkout=canceled`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
      },
    })

    if (!session.url) {
      return {
        ok: false,
        error: createSafeBillingError('STRIPE_ERROR'),
      }
    }

    return { ok: true, value: { url: session.url } }
  } catch (error) {
    return {
      ok: false,
      error: createSafeBillingError('STRIPE_ERROR', error),
    }
  }
}

/**
 * ほつれ購入用Checkout Session作成（単発決済）
 */
export async function createHotsureCheckoutSession(): Promise<
  BillingResult<CheckoutResult>
> {
  try {
    const stripe = getStripeClient()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        ok: false,
        error: createSafeBillingError('UNAUTHORIZED'),
      }
    }

    // 既存のサブスクリプションを確認してcustomer_idを取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // subscriptionsテーブル更新
      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_type: 'free',
        status: 'active',
      })
    }

    const priceId = STRIPE_PRICE_IDS.HOTSURE_PACK
    if (!priceId) {
      return {
        ok: false,
        error: createSafeBillingError('STRIPE_ERROR'),
      }
    }

    // Checkout Session作成（単発決済）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/social?hotsure_purchase=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/social?hotsure_purchase=canceled`,
      metadata: {
        user_id: user.id,
        type: 'hotsure_purchase',
        quantity: HOTSURE_PACK_QUANTITY.toString(),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          type: 'hotsure_purchase',
          quantity: HOTSURE_PACK_QUANTITY.toString(),
        },
      },
    })

    if (!session.url) {
      return {
        ok: false,
        error: createSafeBillingError('STRIPE_ERROR'),
      }
    }

    // 購入履歴を pending で作成（Webhookで completed に更新）
    // session.payment_intentはnullの可能性があるため、後でWebhookで処理

    return { ok: true, value: { url: session.url } }
  } catch (error) {
    return {
      ok: false,
      error: createSafeBillingError('STRIPE_ERROR', error),
    }
  }
}
