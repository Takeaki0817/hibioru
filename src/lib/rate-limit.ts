/**
 * レート制限（Supabase版）
 *
 * PostgreSQLを使用したServer Actionsのレート制限
 * スパム・DoS攻撃対策
 */

import { createAdminClient } from './supabase/admin'
import { logger } from './logger'

/**
 * レート制限設定
 */
export const rateLimits = {
  // フォロー: 1分間に10回まで
  follow: { limit: 10, windowSeconds: 60, actionType: 'follow' },

  // 検索: 1分間に30回まで
  search: { limit: 30, windowSeconds: 60, actionType: 'search' },

  // プロフィール更新: 1分間に5回まで
  profileUpdate: { limit: 5, windowSeconds: 60, actionType: 'profile_update' },

  // エントリー作成: 1分間に20回まで
  entryCreate: { limit: 20, windowSeconds: 60, actionType: 'entry_create' },
} as const

export type RateLimitConfig = (typeof rateLimits)[keyof typeof rateLimits]

/**
 * レート制限の結果
 */
export interface RateLimitResult {
  success: boolean
  remaining?: number
  resetAt?: Date
}

/**
 * レート制限チェック
 *
 * @param config レート制限設定
 * @param userId ユーザーID
 * @returns レート制限の結果
 */
export async function checkRateLimit(
  config: RateLimitConfig | null,
  userId: string
): Promise<RateLimitResult> {
  // configがnullの場合は常に許可
  if (!config) {
    return { success: true }
  }

  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action_type: config.actionType,
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds,
    })

    if (error) {
      // DBエラーの場合は許可（サービス継続性を優先）
      logger.error('レート制限チェックエラー', error)
      return { success: true }
    }

    const result = data as { success: boolean; remaining: number; reset_at: string }

    if (!result.success) {
      logger.warn('レート制限超過', {
        userId,
        actionType: config.actionType,
        resetAt: result.reset_at,
      })
    }

    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: result.reset_at ? new Date(result.reset_at) : undefined,
    }
  } catch (error) {
    // 例外の場合も許可（サービス継続性を優先）
    logger.error('レート制限チェック例外', error)
    return { success: true }
  }
}

/**
 * レート制限エラーメッセージを生成
 */
export function getRateLimitErrorMessage(resetAt?: Date): string {
  if (resetAt) {
    const secondsUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / 1000)
    if (secondsUntilReset > 0) {
      return `リクエストが多すぎます。${secondsUntilReset}秒後に再試行してください`
    }
  }
  return 'リクエストが多すぎます。しばらくしてから再試行してください'
}
