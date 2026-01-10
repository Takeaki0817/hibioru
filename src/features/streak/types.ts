// streak機能の型定義

import type { Result } from '@/lib/types/result'

export type { Result }

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  lastEntryDate: string | null
  hotsureRemaining: number
  bonusHotsure: number
  hotsureUsedCount: number
}

export interface UpdateStreakInput {
  date: string // YYYY-MM-DD
}

/**
 * 週間記録（月〜日の7日分）
 */
export interface WeeklyRecords {
  /** 各日のエントリー有無 [月, 火, 水, 木, 金, 土, 日] */
  entries: boolean[]
  /** 各日のほつれ使用有無 [月, 火, 水, 木, 金, 土, 日] */
  hotsures: boolean[]
}

export type StreakError =
  | { code: 'NOT_FOUND'; message: string }
  | { code: 'UNAUTHORIZED'; message: string }
  | { code: 'DB_ERROR'; message: string }
  | { code: 'INVALID_DATE'; message: string }
