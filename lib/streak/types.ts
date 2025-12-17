// streak機能の型定義

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  lastEntryDate: string | null
  hotsureRemaining: number
  hotsureUsedCount: number
}

export interface UpdateStreakInput {
  date: string // YYYY-MM-DD
}

export type StreakError =
  | { code: 'NOT_FOUND'; message: string }
  | { code: 'UNAUTHORIZED'; message: string }
  | { code: 'DB_ERROR'; message: string }
  | { code: 'INVALID_DATE'; message: string }

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
