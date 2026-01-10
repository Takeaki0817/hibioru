'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getJSTDayBounds } from '@/lib/date-utils'
import type { LimitStatus, LimitError, Result } from '../types'
import { DAILY_LIMITS } from '../constants'

// 日次制限の定数（後方互換性のため再エクスポート）
export const DAILY_ENTRY_LIMIT = DAILY_LIMITS.ENTRY_LIMIT
export const DAILY_IMAGE_LIMIT = DAILY_LIMITS.IMAGE_LIMIT

/**
 * 当日の投稿件数を取得（JST 0:00基準）
 */
export async function getDailyEntryCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { start, end } = getJSTDayBounds()

    const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (error) {
      return 0
    }

    return count ?? 0
  } catch {
    return 0
  }
}

/**
 * 当日の画像アップロード件数を取得（JST 0:00基準）
 */
export async function getDailyImageCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { start, end } = getJSTDayBounds()

    const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .not('image_urls', 'is', null)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (error) {
      return 0
    }

    return count ?? 0
  } catch {
    return 0
  }
}

/**
 * 日次投稿制限をチェック
 */
export async function checkDailyEntryLimit(
  userId: string
): Promise<Result<LimitStatus, LimitError>> {
  try {
    const current = await getDailyEntryCount(userId)
    const remaining = Math.max(0, DAILY_ENTRY_LIMIT - current)

    return {
      ok: true,
      value: {
        allowed: current < DAILY_ENTRY_LIMIT,
        current,
        limit: DAILY_ENTRY_LIMIT,
        remaining
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '制限チェックに失敗しました'
      }
    }
  }
}

/**
 * 日次画像制限をチェック
 */
export async function checkDailyImageLimit(
  userId: string
): Promise<Result<LimitStatus, LimitError>> {
  try {
    const current = await getDailyImageCount(userId)
    const remaining = Math.max(0, DAILY_IMAGE_LIMIT - current)

    return {
      ok: true,
      value: {
        allowed: current < DAILY_IMAGE_LIMIT,
        current,
        limit: DAILY_IMAGE_LIMIT,
        remaining
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '制限チェックに失敗しました'
      }
    }
  }
}
