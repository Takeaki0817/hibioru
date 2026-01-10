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

// アプリURLを取得（Vercel自動環境変数対応）
function getAppUrl(): string {
  // 明示的に設定されている場合
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  // Vercel本番環境
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  // Vercelプレビュー環境
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // ローカル開発
  return 'http://localhost:3000'
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

    // 既にプレミアムの場合はエラー（subscriptionが存在し、freeでない場合のみ）
    if (subscription && subscription.plan_type !== 'free') {
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
      await supabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan_type: 'free',
          status: 'active',
        },
        { onConflict: 'user_id' }
      )
    }

    // Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      locale: 'ja',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/social?checkout=success`,
      cancel_url: `${getAppUrl()}/social?checkout=canceled`,
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

    // ほつれ残高チェック: 合計2個以上は購入不可（RPC関数でFOR UPDATEロック）
    const { data: purchaseCheckData, error: checkError } = await supabase
      .rpc('check_hotsure_purchase_allowed', { p_user_id: user.id })

    if (checkError) {
      return {
        ok: false,
        error: createSafeBillingError('STRIPE_ERROR', checkError),
      }
    }

    // RPC関数の戻り値を型アサーション
    const purchaseCheck = purchaseCheckData as { allowed: boolean; current: number; message?: string } | null

    if (!purchaseCheck?.allowed) {
      return {
        ok: false,
        error: {
          code: 'HOTSURE_LIMIT_EXCEEDED',
          message: purchaseCheck?.message ?? 'ほつれは2個以上持てません',
        },
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
      await supabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan_type: 'free',
          status: 'active',
        },
        { onConflict: 'user_id' }
      )
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
      locale: 'ja',
      submit_type: 'pay',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/social?hotsure_purchase=success`,
      cancel_url: `${getAppUrl()}/social?hotsure_purchase=canceled`,
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
