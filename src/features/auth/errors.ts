// 認証エラー処理ユーティリティ

import type { AuthError } from '@/lib/types/auth'

/**
 * エラーの種別を判定し、AuthError型に変換する
 * @param error - 発生したエラー
 * @returns AuthError型のエラーオブジェクト
 */
export function classifyAuthError(error: unknown): AuthError {
  // ネットワークエラーの判定
  if (isNetworkError(error)) {
    return {
      type: 'network',
      message: 'ネットワークに接続できませんでした。接続を確認して、もう一度お試しください。',
      retryable: true,
    }
  }

  // 認証エラーの判定
  if (isAuthError(error)) {
    return {
      type: 'auth',
      message: 'ログインできませんでした。もう一度お試しください。',
      retryable: true,
    }
  }

  // 予期せぬエラー
  return {
    type: 'unknown',
    message: '問題が発生しました。しばらくしてからお試しください。',
    retryable: true,
  }
}

/**
 * ネットワークエラーかどうかを判定
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('offline')
    )
  }
  return false
}

/**
 * 認証エラーかどうかを判定
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('invalid') ||
      message.includes('expired')
    )
  }
  // Supabase AuthErrorの場合
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status
    return status === 401 || status === 403
  }
  return false
}

/**
 * 認証キャンセルエラーを生成
 */
export function createCancelledError(): AuthError {
  return {
    type: 'cancelled',
    message: '',
    retryable: false,
  }
}

/**
 * エラーパラメータからAuthErrorを生成
 * @param errorParam - URLのエラーパラメータ
 */
export function parseErrorParam(errorParam: string | null): AuthError | null {
  if (errorParam === 'auth_failed') {
    return {
      type: 'auth',
      message: 'ログインできませんでした。もう一度お試しください。',
      retryable: true,
    }
  }
  return null
}
