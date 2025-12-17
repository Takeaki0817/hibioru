// ほつれ機能の型定義

/**
 * ほつれ情報
 * 週2回付与されるストリーク継続保護機能の状態
 */
export interface HotsureInfo {
  /** ほつれ残り回数（0-2） */
  remaining: number
  /** ほつれ使用日の配列（YYYY-MM-DD形式） */
  usedDates: string[]
  /** 週あたりの最大付与数（デフォルト: 2） */
  maxPerWeek: number
}

/**
 * ほつれ消費結果
 * 自動消費処理の成否と結果を表す
 */
export interface ConsumeHotsureResult {
  /** 消費成功フラグ */
  success: boolean
  /** 消費後の残り回数（成功時のみ） */
  remaining?: number
  /** エラーメッセージ（失敗時のみ） */
  error?: string
}

/**
 * ほつれリセット結果
 * 週次リセット処理の結果
 */
export interface ResetHotsureResult {
  /** リセット成功フラグ */
  success: boolean
  /** リセット対象ユーザー数 */
  affectedUsers?: number
  /** エラーメッセージ（失敗時のみ） */
  error?: string
}
