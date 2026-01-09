/**
 * Billing機能用の安全なエラーハンドリング
 */

import { logger } from '@/lib/logger'
import type { BillingError, BillingErrorCode } from '../types'

/**
 * エラーコードに対応する安全なユーザー向けメッセージ
 */
const SAFE_ERROR_MESSAGES: Record<BillingErrorCode, string> = {
  UNAUTHORIZED: '認証が必要です。再度ログインしてください',
  STRIPE_ERROR: '決済処理中にエラーが発生しました。しばらくしてから再度お試しください',
  DB_ERROR: '処理中にエラーが発生しました。しばらくしてから再度お試しください',
  SUBSCRIPTION_EXISTS: '既にサブスクリプションが存在します',
  INVALID_PLAN: '無効なプランが指定されました',
  CUSTOMER_NOT_FOUND: '顧客情報が見つかりませんでした',
}

/**
 * 内部エラーを安全なユーザー向けエラーに変換
 *
 * @param code エラーコード
 * @param internalError 内部エラー（ログ出力用、ユーザーには非公開）
 * @returns BillingError ユーザー向けの安全なエラーオブジェクト
 */
export function createSafeBillingError(
  code: BillingErrorCode,
  internalError?: unknown
): BillingError {
  // 内部エラーはログに記録
  if (internalError) {
    logger.error(`[Billing:${code}]`, internalError)
  }

  return {
    code,
    message: SAFE_ERROR_MESSAGES[code],
  }
}

/**
 * 未知のエラーを安全にラップ
 */
export function wrapUnknownBillingError(error: unknown): BillingError {
  logger.error('[Billing:UNKNOWN_ERROR]', error)

  return {
    code: 'DB_ERROR',
    message: SAFE_ERROR_MESSAGES.DB_ERROR,
  }
}
