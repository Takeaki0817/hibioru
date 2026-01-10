'use server'

import 'server-only'

import { headers } from 'next/headers'
import Stripe from 'stripe'
import { authActionClient } from '@/lib/safe-action'
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

/**
 * Customer Portal Session作成（サブスクリプション管理用）
 */
export const createPortalSession = authActionClient.action(
  async ({ ctx: { user, supabase } }): Promise<CheckoutResult> => {
    const stripe = getStripeClient()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      throw new Error('Stripe顧客情報が見つかりません')
    }

    const appUrl = await getAppUrl()
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/social`,
      locale: 'ja',
    })

    return { url: session.url }
  }
)
