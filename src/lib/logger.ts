/**
 * 環境に応じた条件付きロギング
 *
 * - 開発環境: コンソールに出力
 * - 本番環境: ログ出力を抑制（将来的に外部ログサービス対応予定）
 */

const isDev = process.env.NODE_ENV === 'development'

export interface Logger {
  error: (message: string, error?: unknown) => void
  warn: (message: string, data?: unknown) => void
  info: (message: string, data?: unknown) => void
  debug: (message: string, data?: unknown) => void
}

export const logger: Logger = {
  /**
   * エラーログ
   * セキュリティ上の理由から、本番環境では詳細を出力しない
   */
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error)
    }
    // TODO: 本番環境では外部ログサービス（Sentry等）に送信
  },

  /**
   * 警告ログ
   */
  warn: (message: string, data?: unknown) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data)
    }
  },

  /**
   * 情報ログ
   */
  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, data)
    }
  },

  /**
   * デバッグログ（開発環境のみ）
   */
  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data)
    }
  },
}
