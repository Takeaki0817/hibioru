/**
 * 環境に応じた条件付きロギング
 *
 * - error/warn: 全環境で出力（Vercelログで確認可能）
 * - info/debug: 開発環境のみ
 */

const isDev = process.env.NODE_ENV === 'development'

export interface Logger {
  error: (message: string, error?: unknown) => void
  warn: (message: string, data?: unknown) => void
  info: (message: string, data?: unknown) => void
  debug: (message: string, data?: unknown) => void
}

/**
 * エラー情報をシリアライズ可能な形式に変換
 * Vercelログで見やすくするため
 */
function formatError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isDev ? error.stack : undefined, // 本番ではスタックトレースを省略
    }
  }
  return error
}

export const logger: Logger = {
  /**
   * エラーログ（全環境で出力）
   */
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, formatError(error))
  },

  /**
   * 警告ログ（全環境で出力）
   */
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data)
  },

  /**
   * 情報ログ（開発環境のみ）
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
