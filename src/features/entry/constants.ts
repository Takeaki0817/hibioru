// エントリー入力機能の定数

import { PLAN_LIMITS } from '@/features/billing/constants'

export const ENTRY_CONFIG = {
  // 画像制限
  MAX_IMAGES: 2,

  // 下書き自動保存
  DEBOUNCE_DRAFT_MS: 300,

  // 編集可能期間
  EDIT_WINDOW_HOURS: 24,
} as const

// 日次制限（billing/constants.tsのPLAN_LIMITSと統一）
// 注意: この定数は後方互換性のため維持。新規コードではcheckEntryLimit()を使用
export const DAILY_LIMITS = {
  ENTRY_LIMIT: PLAN_LIMITS.free.dailyEntryLimit!,  // 15（無料プラン）
  IMAGE_LIMIT: PLAN_LIMITS.free.monthlyImageLimit!, // 5（無料プラン）
} as const

// 個別エクスポート（テストや他モジュールで使用）
export const DAILY_ENTRY_LIMIT = DAILY_LIMITS.ENTRY_LIMIT
export const DAILY_IMAGE_LIMIT = DAILY_LIMITS.IMAGE_LIMIT
