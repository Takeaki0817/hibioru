// エントリー入力機能の定数

export const ENTRY_CONFIG = {
  // 画像制限
  MAX_IMAGES: 2,

  // 下書き自動保存
  DEBOUNCE_DRAFT_MS: 300,

  // 編集可能期間
  EDIT_WINDOW_HOURS: 24,
} as const

// 日次制限（daily-limits.tsより）
export const DAILY_LIMITS = {
  ENTRY_LIMIT: 20,   // 1日の投稿上限
  IMAGE_LIMIT: 5,    // 1日の画像上限
} as const

/**
 * エントリコンテンツの検証ルール
 */
export const CONTENT_VALIDATION = {
  MAX_LENGTH: 10000, // 10,000文字
  MIN_LENGTH: 1,
  ERROR_MESSAGES: {
    EMPTY: '内容を入力してください',
    TOO_LONG: '内容は10,000文字以内で入力してください',
  },
} as const

/**
 * エントリコンテンツを検証
 * @param content 検証対象のコンテンツ
 * @returns 検証結果（valid: true/false, error?: エラーメッセージ）
 */
export function validateEntryContent(content: string): {
  valid: boolean
  error?: string
} {
  const trimmed = content.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: CONTENT_VALIDATION.ERROR_MESSAGES.EMPTY }
  }

  if (trimmed.length > CONTENT_VALIDATION.MAX_LENGTH) {
    return { valid: false, error: CONTENT_VALIDATION.ERROR_MESSAGES.TOO_LONG }
  }

  return { valid: true }
}
