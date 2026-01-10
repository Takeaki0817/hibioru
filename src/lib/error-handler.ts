/**
 * 安全なエラーハンドリング
 *
 * 内部エラーの詳細を露出せず、ユーザー向けの汎用メッセージに変換する
 */

import { logger } from './logger'
import type { SocialError } from '@/features/social/types'
import type { EntryError } from '@/features/entry/types'

/**
 * エラーコードに対応する安全なユーザー向けメッセージ
 */
const SAFE_ERROR_MESSAGES: Record<SocialError['code'], string> = {
  // 認証・認可
  UNAUTHORIZED: '認証が必要です。再度ログインしてください',
  FORBIDDEN: 'この操作を行う権限がありません',

  // リソース
  NOT_FOUND: '対象が見つかりませんでした',

  // フォロー関連
  ALREADY_FOLLOWING: '既にフォロー済みです',
  NOT_FOLLOWING: 'フォローしていません',
  SELF_FOLLOW: '自分自身をフォローすることはできません',

  // お祝い関連
  ALREADY_CELEBRATED: '既にお祝い済みです',
  NOT_CELEBRATED: 'お祝いしていません',

  // ユーザー名関連
  USERNAME_TAKEN: 'このユーザーIDは既に使用されています',
  INVALID_USERNAME: 'ユーザーIDが無効です',

  // 表示名関連
  INVALID_DISPLAY_NAME: '表示名が無効です',

  // レート制限
  RATE_LIMITED: 'リクエストが多すぎます。しばらくしてから再度お試しください',

  // データベース
  DB_ERROR: '処理中にエラーが発生しました。しばらくしてから再度お試しください',
}

/**
 * 内部エラーを安全なユーザー向けエラーに変換
 *
 * @param code エラーコード
 * @param internalError 内部エラー（ログ出力用、ユーザーには非公開）
 * @returns SocialError ユーザー向けの安全なエラーオブジェクト
 */
export function createSafeError(
  code: SocialError['code'],
  internalError?: unknown
): SocialError {
  // 内部エラーはログに記録（本番では外部サービスへ）
  if (internalError) {
    logger.error(`[${code}]`, internalError)
  }

  return {
    code,
    message: SAFE_ERROR_MESSAGES[code],
  }
}

/**
 * 未知のエラーを安全にラップ
 */
export function wrapUnknownError(error: unknown): SocialError {
  logger.error('[UNKNOWN_ERROR]', error)

  return {
    code: 'DB_ERROR', // 汎用的なエラーとして扱う
    message: SAFE_ERROR_MESSAGES.DB_ERROR,
  }
}

// ============================================================
// Entry機能用のエラーハンドリング
// ============================================================

/**
 * Entryエラーコードに対応する安全なユーザー向けメッセージ
 */
const SAFE_ENTRY_ERROR_MESSAGES: Record<EntryError['code'], string> = {
  NOT_FOUND: '記録が見つかりませんでした',
  EDIT_EXPIRED: '編集可能期間（24時間）を過ぎています',
  UNAUTHORIZED: '認証が必要です。再度ログインしてください',
  FORBIDDEN: 'この記録へのアクセス権限がありません',
  DB_ERROR: '処理中にエラーが発生しました。しばらくしてから再度お試しください',
  EMPTY_CONTENT: '内容を入力してください',
  LIMIT_EXCEEDED: '本日の投稿上限に達しました',
  IMAGE_LIMIT_EXCEEDED: '今月の画像上限に達しました',
  RATE_LIMITED: 'リクエストが多すぎます。しばらくしてから再度お試しください',
}

/**
 * 内部エラーを安全なEntry向けエラーに変換
 */
export function createSafeEntryError(
  code: EntryError['code'],
  internalError?: unknown
): EntryError {
  if (internalError) {
    logger.error(`[Entry:${code}]`, internalError)
  }

  return {
    code,
    message: SAFE_ENTRY_ERROR_MESSAGES[code],
  }
}
