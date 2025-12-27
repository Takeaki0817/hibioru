// タイムライン機能の定数

export const TIMELINE_CONFIG = {
  // ページネーション
  DATES_PER_PAGE: 5,
  DEFAULT_PAGE_SIZE: 20,

  // スクロール・プリフェッチ
  PREFETCH_DAYS: 4,
  DETECTION_OFFSET_PX: 12,
  TOP_MARGIN_PX: 100,
  BOTTOM_MARGIN_PX: 100,

  // データフェッチ
  STALE_TIME_MS: 10 * 60 * 1000,  // 10分
  GC_TIME_MS: 30 * 60 * 1000,      // 30分

  // 待機時間
  WAIT_FOR_DOM_MS: 500,
  WAIT_FOR_LAYOUT_MS: 300,
  SCROLL_BEHAVIOR: 'smooth' as const,
} as const

// カレンダー用定数
export const CALENDAR_CONFIG = {
  STALE_TIME_MS: 5 * 60 * 1000,   // 5分
  GC_TIME_MS: 30 * 60 * 1000,      // 30分
} as const
