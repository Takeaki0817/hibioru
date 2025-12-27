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
