import type { AchievementType } from './types'

// 達成閾値（固定）
export const ACHIEVEMENT_THRESHOLDS: Record<Exclude<AchievementType, 'shared_entry'>, readonly number[]> = {
  // 1日の投稿数
  daily_posts: [5, 10, 15, 20],
  // 総投稿数
  total_posts: [10, 50, 100, 250, 500, 1000],
  // 継続日数（ストリーク）
  streak_days: [3, 7, 14, 30, 60, 100, 365],
} as const

// 達成タイプの表示名
export const ACHIEVEMENT_TYPE_LABELS: Record<AchievementType, string> = {
  daily_posts: '1日の投稿数',
  total_posts: '総投稿数',
  streak_days: '継続日数',
  shared_entry: '共有投稿',
} as const

// 達成メッセージ生成
export function getAchievementMessage(type: AchievementType, threshold: number): string {
  switch (type) {
    case 'daily_posts':
      return `今日${threshold}回投稿しました！`
    case 'total_posts':
      return `累計${threshold}投稿達成！`
    case 'streak_days':
      return `${threshold}日連続記録達成！`
    case 'shared_entry':
      return '投稿を共有しました'
    default:
      return '達成しました！'
  }
}

// 達成アイコン
export const ACHIEVEMENT_ICONS: Record<AchievementType, string> = {
  daily_posts: '📝',
  total_posts: '🏆',
  streak_days: '🔥',
  shared_entry: '📤',
} as const

// ページネーション設定
export const SOCIAL_PAGINATION = {
  FEED_PAGE_SIZE: 20,
  NOTIFICATIONS_PAGE_SIZE: 20,
  USER_SEARCH_PAGE_SIZE: 10,
} as const

// ユーザー名のバリデーション
export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 20,
  // 英数字とアンダースコアのみ
  PATTERN: /^[a-zA-Z0-9_]+$/,
  ERROR_MESSAGES: {
    TOO_SHORT: 'ユーザーIDは3文字以上で入力してください',
    TOO_LONG: 'ユーザーIDは20文字以内で入力してください',
    INVALID_CHARS: 'ユーザーIDは英数字とアンダースコア(_)のみ使用できます',
    TAKEN: 'このユーザーIDは既に使用されています',
  },
} as const

// ユーザー名のバリデーション関数
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (username.length < USERNAME_RULES.MIN_LENGTH) {
    return { valid: false, error: USERNAME_RULES.ERROR_MESSAGES.TOO_SHORT }
  }
  if (username.length > USERNAME_RULES.MAX_LENGTH) {
    return { valid: false, error: USERNAME_RULES.ERROR_MESSAGES.TOO_LONG }
  }
  if (!USERNAME_RULES.PATTERN.test(username)) {
    return { valid: false, error: USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS }
  }
  return { valid: true }
}
