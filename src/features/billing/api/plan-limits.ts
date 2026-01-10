'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getJSTDayBounds, getJSTMonthBounds } from '@/lib/date-utils'
import { logger } from '@/lib/logger'
import { PLAN_LIMITS } from '../constants'
import type { BillingResult, LimitStatus, LimitsResponse } from '../types'
import { getSubscription, getUserPlanType } from './subscription-service'

/**
 * 投稿制限チェック（プラン考慮版）
 */
export async function checkEntryLimit(
  userId: string
): Promise<BillingResult<LimitStatus>> {
  try {
    const supabase = await createClient()
    const planType = await getUserPlanType(userId)
    const limits = PLAN_LIMITS[planType]

    // プレミアムは無制限
    if (limits.dailyEntryLimit === null) {
      return {
        ok: true,
        value: {
          allowed: true,
          current: 0,
          limit: null,
          remaining: null,
          planType,
        },
      }
    }

    // 無料プランの日次カウント
    const { start, end } = getJSTDayBounds()
    const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (error) {
      logger.error('投稿数カウントエラー', error)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: '制限チェックに失敗しました' },
      }
    }

    const current = count ?? 0
    const remaining = Math.max(0, limits.dailyEntryLimit - current)

    return {
      ok: true,
      value: {
        allowed: current < limits.dailyEntryLimit,
        current,
        limit: limits.dailyEntryLimit,
        remaining,
        planType,
      },
    }
  } catch (error) {
    logger.error('投稿制限チェックエラー', error)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: '制限チェックに失敗しました' },
    }
  }
}

/**
 * 画像制限チェック（月次、プラン考慮版）
 */
export async function checkImageLimit(
  userId: string
): Promise<BillingResult<LimitStatus>> {
  try {
    const supabase = await createClient()
    const planType = await getUserPlanType(userId)
    const limits = PLAN_LIMITS[planType]

    // プレミアムは無制限
    if (limits.monthlyImageLimit === null) {
      return {
        ok: true,
        value: {
          allowed: true,
          current: 0,
          limit: null,
          remaining: null,
          planType,
        },
      }
    }

    // 無料プランの月次カウント（画像付き投稿数をカウント）
    const { start, end } = getJSTMonthBounds()
    const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .not('image_urls', 'is', null)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (error) {
      logger.error('画像数カウントエラー', error)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: '制限チェックに失敗しました' },
      }
    }

    const current = count ?? 0
    const remaining = Math.max(0, limits.monthlyImageLimit - current)

    return {
      ok: true,
      value: {
        allowed: current < limits.monthlyImageLimit,
        current,
        limit: limits.monthlyImageLimit,
        remaining,
        planType,
      },
    }
  } catch (error) {
    logger.error('画像制限チェックエラー', error)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: '制限チェックに失敗しました' },
    }
  }
}

/**
 * 現在のプランと残り制限を取得（API用）
 */
export async function getPlanLimits(
  userId: string
): Promise<BillingResult<LimitsResponse>> {
  try {
    const supabase = await createClient()

    // サブスクリプション情報、制限チェック、ほつれ残高を並列実行
    const [subscriptionResult, entryResult, imageResult, streakResult] = await Promise.all([
      getSubscription(userId),
      checkEntryLimit(userId),
      checkImageLimit(userId),
      supabase
        .from('streaks')
        .select('hotsure_remaining, bonus_hotsure')
        .eq('user_id', userId)
        .single(),
    ])

    const subscription = subscriptionResult.ok ? subscriptionResult.value : null
    const planType = subscription?.planType ?? 'free'

    // キャンセル済み判定: canceledAtがあり、まだ期間終了前
    const canceledAt = subscription?.canceledAt?.toISOString() ?? null
    const currentPeriodEnd = subscription?.currentPeriodEnd?.toISOString() ?? null

    // ほつれ残高
    const hotsureRemaining = streakResult.data?.hotsure_remaining ?? 0
    const bonusHotsure = streakResult.data?.bonus_hotsure ?? 0

    return {
      ok: true,
      value: {
        planType,
        entryLimit: entryResult.ok ? entryResult.value : null,
        imageLimit: imageResult.ok ? imageResult.value : null,
        canceledAt,
        currentPeriodEnd,
        hotsureRemaining,
        bonusHotsure,
      },
    }
  } catch (error) {
    logger.error('プラン制限取得エラー', error)
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: '制限情報の取得に失敗しました' },
    }
  }
}
