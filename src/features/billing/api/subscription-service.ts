'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { BillingResult, Subscription, PlanType } from '../types'

/**
 * ユーザーのサブスクリプション情報を取得
 */
export async function getSubscription(
  userId: string
): Promise<BillingResult<Subscription | null>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_type, status, current_period_start, current_period_end, canceled_at, created_at, updated_at'
      )
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 行が見つからない
      logger.error('サブスクリプション取得エラー', error)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'サブスクリプションの取得に失敗しました' },
      }
    }

    if (!data) {
      return { ok: true, value: null }
    }

    return {
      ok: true,
      value: {
        id: data.id,
        userId: data.user_id,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        stripePriceId: data.stripe_price_id,
        planType: data.plan_type as PlanType,
        status: data.status as Subscription['status'],
        currentPeriodStart: data.current_period_start
          ? new Date(data.current_period_start)
          : null,
        currentPeriodEnd: data.current_period_end
          ? new Date(data.current_period_end)
          : null,
        canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      },
    }
  } catch (error) {
    logger.error('サブスクリプション取得エラー', error)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'サブスクリプションの取得に失敗しました' },
    }
  }
}

/**
 * ユーザーのプランタイプを取得
 */
export async function getUserPlanType(userId: string): Promise<PlanType> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .single()

    // アクティブなプレミアムサブスクリプションのみ有効
    if (data?.status === 'active' && data.plan_type !== 'free') {
      return data.plan_type as PlanType
    }

    return 'free'
  } catch {
    return 'free'
  }
}

/**
 * 初期サブスクリプションレコードを作成（無料プラン）
 */
export async function createInitialSubscription(
  userId: string,
  stripeCustomerId?: string
): Promise<BillingResult<Subscription>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: stripeCustomerId ?? null,
          plan_type: 'free',
          status: 'active',
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      logger.error('サブスクリプション作成エラー', error)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: 'サブスクリプションの作成に失敗しました' },
      }
    }

    return {
      ok: true,
      value: {
        id: data.id,
        userId: data.user_id,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        stripePriceId: data.stripe_price_id,
        planType: data.plan_type as PlanType,
        status: data.status as Subscription['status'],
        currentPeriodStart: data.current_period_start
          ? new Date(data.current_period_start)
          : null,
        currentPeriodEnd: data.current_period_end
          ? new Date(data.current_period_end)
          : null,
        canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      },
    }
  } catch (error) {
    logger.error('サブスクリプション作成エラー', error)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'サブスクリプションの作成に失敗しました' },
    }
  }
}
