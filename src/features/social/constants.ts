import { Pencil, Trophy, Flame, Share2, type LucideIcon } from 'lucide-react'
import type { AchievementType } from './types'

// アニメーション設定（framer-motion用）
export const ANIMATION_CONFIG = {
  // デフォルトのスプリングアニメーション
  springDefault: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  },
  // よりスナッピーなスプリングアニメーション（ボタン等）
  springSnappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },
} as const

// パーティクルエフェクト設定（お祝いアニメーション用）
export const PARTICLE_CONFIG = {
  COUNT: 12,
  COLORS: [
    'bg-celebrate-300',
    'bg-celebrate-400',
    'bg-celebrate-500',
    'bg-accent-400',
  ],
  DURATION_MS: 600,
} as const

// パーティクル生成関数
export function generateParticles() {
  return Array.from({ length: PARTICLE_CONFIG.COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_CONFIG.COUNT) * i + Math.random() * 30 - 15,
    distance: 40 + Math.random() * 10,
    color: PARTICLE_CONFIG.COLORS[Math.floor(Math.random() * PARTICLE_CONFIG.COLORS.length)],
    size: Math.random() > 0.5 ? 'size-2.5' : 'size-2',
    delay: Math.random() * 0.1,
  }))
}

// 達成閾値（固定）
export const ACHIEVEMENT_THRESHOLDS: Record<Exclude<AchievementType, 'shared_entry'>, readonly number[]> = {
  // 1日の投稿数: 20から50まで10刻み
  daily_posts: [20, 30, 40, 50],
  // 総投稿数: 10, 30, 50, 100, 150, 200, 250, 300, 400, 500, 以降100刻みで10000まで
  total_posts: [
    10, 30, 50, 100, 150, 200, 250, 300, 400, 500,
    ...Array.from({ length: 95 }, (_, i) => 600 + i * 100),
  ],
  // 継続日数: 3, 7, 14, 30, 60, 90, 120, 150, 180, 240, 365, 以降60刻みで3650日まで
  streak_days: [
    3, 7, 14, 30, 60, 90, 120, 150, 180, 240, 365,
    ...Array.from({ length: 55 }, (_, i) => 425 + i * 60),
  ],
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


// 達成アイコン設定
export const ACHIEVEMENT_ICONS: Record<
  AchievementType,
  { icon: LucideIcon; color: string }
> = {
  daily_posts: { icon: Pencil, color: 'text-lime-600' },
  total_posts: { icon: Trophy, color: 'text-orange-400' },
  streak_days: { icon: Flame, color: 'text-red-600' },
  shared_entry: { icon: Share2, color: 'text-sky-500' },
}

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

// 表示名のバリデーション
export const DISPLAY_NAME_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 50,
  // 制御文字・危険な文字を禁止
  FORBIDDEN_PATTERN: /[\x00-\x1F\x7F<>"'&]/,
  ERROR_MESSAGES: {
    TOO_SHORT: '表示名を入力してください',
    TOO_LONG: '表示名は50文字以内で入力してください',
    INVALID_CHARS: '表示名に使用できない文字が含まれています',
  },
} as const

// 表示名のバリデーション関数
export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  const trimmed = displayName.trim()
  if (trimmed.length < DISPLAY_NAME_RULES.MIN_LENGTH) {
    return { valid: false, error: DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_SHORT }
  }
  if (trimmed.length > DISPLAY_NAME_RULES.MAX_LENGTH) {
    return { valid: false, error: DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_LONG }
  }
  if (DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test(trimmed)) {
    return { valid: false, error: DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS }
  }
  return { valid: true }
}

// 表示名のサニタイズ
export function sanitizeDisplayName(displayName: string): string {
  return displayName
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // 制御文字除去
    .slice(0, DISPLAY_NAME_RULES.MAX_LENGTH)
}

// ILIKE検索用ワイルドカードエスケープ
export function escapeIlikeWildcards(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

// 共通エラーメッセージ
export const ERROR_MESSAGES = {
  UNAUTHORIZED: '認証が必要です。再度ログインしてください',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください',
  FEED_LOAD_FAILED: 'フィードの読み込みに失敗しました',
  NOTIFICATIONS_LOAD_FAILED: '通知の読み込みに失敗しました',
  FOLLOW_LIST_LOAD_FAILED: 'フォローリストの読み込みに失敗しました',
  USER_SEARCH_FAILED: 'ユーザー検索に失敗しました',
  CELEBRATION_FAILED: 'お祝いの処理に失敗しました',
  LOAD_FAILED: '読み込みに失敗しました',
  RETRY: '再試行',
} as const
