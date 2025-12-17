// ほつれサービス
// ストリーク継続を保護する「ほつれ」機能の実装

import { createClient } from '@/lib/supabase/server'
import type {
  HotsureInfo,
  ConsumeHotsureResult,
  ResetHotsureResult,
} from './types'

// ほつれの最大付与数（週あたり）
const MAX_HOTSURE_PER_WEEK = 2

/**
 * ほつれ情報を取得
 * @param userId ユーザーID
 * @returns ほつれ情報（残り回数、使用履歴）
 */
export async function getHotsureInfo(
  userId: string
): Promise<HotsureInfo | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('streaks')
    .select('hotsure_remaining, hotsure_used_dates')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    console.error('Failed to get hotsure info:', error)
    return null
  }

  return {
    remaining: data.hotsure_remaining,
    usedDates: data.hotsure_used_dates,
    maxPerWeek: MAX_HOTSURE_PER_WEEK,
  }
}

/**
 * ほつれを使用できるか確認
 * @param userId ユーザーID
 * @returns 使用可能ならtrue
 */
export async function canUseHotsure(userId: string): Promise<boolean> {
  const info = await getHotsureInfo(userId)

  if (!info) {
    return false
  }

  // 残り回数がない
  if (info.remaining <= 0) {
    return false
  }

  // 今日既に使用済み
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  if (info.usedDates.includes(today)) {
    return false
  }

  return true
}

/**
 * ほつれを自動消費
 * ストリークが途切れそうな日に自動的にほつれを1つ消費する
 * FOR UPDATE により同時実行を防止
 *
 * @param userId ユーザーID
 * @returns 消費結果（成功/失敗、残り回数）
 */
export async function consumeHotsure(
  userId: string
): Promise<ConsumeHotsureResult> {
  const supabase = await createClient()

  // RPC関数を呼び出し（FOR UPDATEで同時実行を防止）
  const { data, error } = await supabase.rpc('consume_hotsure', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Failed to consume hotsure:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  // RPCの戻り値をパース
  if (!data.success) {
    return {
      success: false,
      error: data.error,
    }
  }

  return {
    success: true,
    remaining: data.remaining,
  }
}

/**
 * ほつれを週次リセット
 * 毎週月曜0:00 JSTに実行される想定
 * 全ユーザーのほつれを2にリセットし、使用履歴をクリア
 *
 * @returns リセット結果（成功/失敗、影響を受けたユーザー数）
 */
export async function resetHotsureWeekly(): Promise<ResetHotsureResult> {
  const supabase = await createClient()

  // RPC関数を呼び出し
  const { data, error } = await supabase.rpc('reset_hotsure_weekly')

  if (error) {
    console.error('Failed to reset hotsure weekly:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  // RPCの戻り値をパース
  if (!data.success) {
    return {
      success: false,
      error: data.error,
    }
  }

  return {
    success: true,
    affectedUsers: data.affected_users,
  }
}
