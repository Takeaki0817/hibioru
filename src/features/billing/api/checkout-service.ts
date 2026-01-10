'use server'

import 'server-only'

import { z } from 'zod'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { authActionClient } from '@/lib/safe-action'
import { STRIPE_PRICE_IDS, HOTSURE_PACK_QUANTITY } from '../constants'
import type { CheckoutResult } from '../types'

// 遅延初期化（ビルド時のエラー回避）
function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  })
}

// アプリURLを取得（リクエストヘッダーから動的に取得）
async function getAppUrl(): Promise<string> {
  // 明示的に設定されている場合
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  // リクエストヘッダーからホストを取得
  const headersList = await headers()
  const host = headersList.get('host')
  if (host) {
    const protocol = host.includes('localhost') ? 'http' : 'https'
    return `${protocol}://${host}`
  }
  // フォールバック
  return 'http://localhost:3000'
}

// 入力スキーマ
const checkoutSchema = z.object({
  planType: z.enum(['premium_monthly', 'premium_yearly']),
})

/**
 * サブスクリプション用Checkout Session作成
 */
export const createCheckoutSession = authActionClient
  .inputSchema(checkoutSchema)
  .action(async ({ parsedInput: { planType }, ctx: { user, supabase } }): Promise<CheckoutResult> => {
    const stripe = getStripeClient()

    // 既存のサブスクリプションを確認
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, plan_type')
      .eq('user_id', user.id)
      .single()

    // 既にプレミアムの場合はエラー（subscriptionが存在し、freeでない場合のみ）
    if (subscription && subscription.plan_type !== 'free') {
      throw new Error('既にプレミアムプランに加入しています')
    }

    const priceId =
      planType === 'premium_monthly'
        ? STRIPE_PRICE_IDS.PREMIUM_MONTHLY
        : STRIPE_PRICE_IDS.PREMIUM_YEARLY

    if (!priceId) {
      throw new Error('価格情報の取得に失敗しました')
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
    const appUrl = await getAppUrl()
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      locale: 'ja',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/social?checkout=success`,
      cancel_url: `${appUrl}/social?checkout=canceled`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
      },
    })

    if (!session.url) {
      throw new Error('チェックアウトセッションの作成に失敗しました')
    }

    return { url: session.url }
  })

/**
 * ほつれ購入用Checkout Session作成（単発決済）
 */
export const createHotsureCheckoutSession = authActionClient.action(
  async ({ ctx: { user, supabase } }): Promise<CheckoutResult> => {
    const stripe = getStripeClient()

    // ほつれ残高チェック: 合計2個以上は購入不可（RPC関数でFOR UPDATEロック）
    const { data: purchaseCheckData, error: checkError } = await supabase.rpc(
      'check_hotsure_purchase_allowed',
      { p_user_id: user.id }
    )

    if (checkError) {
      throw new Error('ほつれ残高の確認に失敗しました')
    }

    // RPC関数の戻り値を型アサーション
    const purchaseCheck = purchaseCheckData as {
      allowed: boolean
      current: number
      message?: string
    } | null

    if (!purchaseCheck?.allowed) {
      throw new Error(purchaseCheck?.message ?? 'ほつれは2個以上持てません')
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
      throw new Error('価格情報の取得に失敗しました')
    }

    // Checkout Session作成（単発決済）
    const appUrl = await getAppUrl()
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment',
      locale: 'ja',
      submit_type: 'pay',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/social?hotsure_purchase=success`,
      cancel_url: `${appUrl}/social?hotsure_purchase=canceled`,
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
      throw new Error('チェックアウトセッションの作成に失敗しました')
    }

    // 購入履歴を pending で作成（Webhookで completed に更新）
    // session.payment_intentはnullの可能性があるため、後でWebhookで処理

    return { url: session.url }
  }
)
