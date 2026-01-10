'use server'

import 'server-only'

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { BillingResult, CheckoutResult } from '../types'

// 遅延初期化（ビルド時のエラー回避）
function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  })
}

/**
 * Customer Portal Session作成（サブスクリプション管理用）
 */
export async function createPortalSession(): Promise<BillingResult<CheckoutResult>> {
  try {
    const stripe = getStripeClient()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '認証が必要です' },
      }
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return {
        ok: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Stripe顧客情報が見つかりません',
        },
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/social`,
      locale: 'ja',
    })

    return { ok: true, value: { url: session.url } }
  } catch (error) {
    logger.error('Portal Session作成エラー', error)
    return {
      ok: false,
      error: { code: 'STRIPE_ERROR', message: 'ポータルの作成に失敗しました' },
    }
  }
}
