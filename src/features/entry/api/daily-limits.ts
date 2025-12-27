'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { LimitStatus, LimitError, Result } from '../types'

// 日次制限の定数
export const DAILY_ENTRY_LIMIT = 20  // 1日の投稿上限
export const DAILY_IMAGE_LIMIT = 5   // 1日の画像上限

/**
 * JST基準で当日の開始・終了時刻を取得
 */
function getJSTDayBounds(): { start: Date; end: Date } {
  const now = new Date()

  // JST（UTC+9）のオフセットを適用
  const jstOffset = 9 * 60 * 60 * 1000
  const jstNow = new Date(now.getTime() + jstOffset)

  // JSTでの当日0:00を計算
  const jstDate = new Date(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate(),
    0, 0, 0, 0
  )

  // UTCに戻す（JSTオフセット分を引く）
  const startUtc = new Date(jstDate.getTime() - jstOffset)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)

  return { start: startUtc, end: endUtc }
}

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
      .not('image_url', 'is', null)
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
