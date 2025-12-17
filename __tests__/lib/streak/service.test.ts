/**
 * ストリークサービスのユニットテスト
 * TDD方式: テストファースト、実装、リファクタリング
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// モックのSupabaseクライアント
const mockSupabaseClient = {
  from: jest.fn(),
}

// Supabaseクライアント作成関数をモック
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('StreakService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getStreakInfo', () => {
    it('ユーザーのストリーク情報を正しく取得できる', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockData = {
        current_streak: 5,
        longest_streak: 10,
        last_entry_date: '2025-12-16',
        hotsure_remaining: 1,
        hotsure_used_dates: ['2025-12-15'],
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const { getStreakInfo } = await import('@/lib/streak/service')

      // Act
      const result = await getStreakInfo(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(5)
        expect(result.value.longestStreak).toBe(10)
        expect(result.value.lastEntryDate).toBe('2025-12-16')
        expect(result.value.hotsureRemaining).toBe(1)
        expect(result.value.hotsureUsedCount).toBe(1)
      }
    })

    it('レコードが存在しない場合は初期値を返す', async () => {
      // Arrange
      const userId = 'new-user-id'

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // レコード未存在エラー
            }),
          }),
        }),
      })

      const { getStreakInfo } = await import('@/lib/streak/service')

      // Act
      const result = await getStreakInfo(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(0)
        expect(result.value.longestStreak).toBe(0)
        expect(result.value.lastEntryDate).toBe(null)
        expect(result.value.hotsureRemaining).toBe(2)
        expect(result.value.hotsureUsedCount).toBe(0)
      }
    })
  })

  describe('updateStreakOnEntry', () => {
    it('初回記録時にストリークが1増加する', async () => {
      // Arrange
      const userId = 'test-user-id'
      const today = '2025-12-17'

      // 既存データ取得のモック
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 0,
                longest_streak: 0,
                last_entry_date: null,
                hotsure_remaining: 2,
                hotsure_used_dates: [],
              },
              error: null,
            }),
          }),
        }),
      })

      // 更新処理のモック
      mockSupabaseClient.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      })

      // 更新後の取得のモック
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 1,
                longest_streak: 1,
                last_entry_date: today,
                hotsure_remaining: 2,
                hotsure_used_dates: [],
              },
              error: null,
            }),
          }),
        }),
      })

      const { updateStreakOnEntry } = await import('@/lib/streak/service')

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(1)
        expect(result.value.longestStreak).toBe(1)
      }
    })

    it('同日2回目の記録ではストリークが増加しない', async () => {
      // Arrange
      const userId = 'test-user-id'
      const today = '2025-12-17'

      // 既存データ（同日に記録済み）
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 5,
                longest_streak: 10,
                last_entry_date: today,
                hotsure_remaining: 1,
                hotsure_used_dates: [],
              },
              error: null,
            }),
          }),
        }),
      })

      // 同日2回目なので更新後の取得のみ
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 5,
                longest_streak: 10,
                last_entry_date: today,
                hotsure_remaining: 1,
                hotsure_used_dates: [],
              },
              error: null,
            }),
          }),
        }),
      })

      const { updateStreakOnEntry } = await import('@/lib/streak/service')

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(5) // 増加していない
      }
    })

    it('current_streakがlongest_streakを超えた場合にlongest_streakも更新される', async () => {
      // Arrange
      const userId = 'test-user-id'

      // 既存データ（current_streak=10, longest_streak=10）
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 10,
                longest_streak: 10,
                last_entry_date: '2025-12-16',
                hotsure_remaining: 2,
                hotsure_used_dates: [],
              },
              error: null,
            }),
          }),
        }),
      })

      // 更新処理のモック
      mockSupabaseClient.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      })

      // 更新後の取得（current_streak=11, longest_streak=11）
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 11,
                longest_streak: 11,
                last_entry_date: '2025-12-17',
                hotsure_remaining: 2,
                hotsure_used_dates: [],
              },
              error: null,
            }),
          }),
        }),
      })

      const { updateStreakOnEntry } = await import('@/lib/streak/service')

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(11)
        expect(result.value.longestStreak).toBe(11)
      }
    })
  })

  describe('breakStreak', () => {
    it('current_streakを0にリセットし、longest_streakは維持する', async () => {
      // Arrange
      const userId = 'test-user-id'

      // 更新処理のモック
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const { breakStreak } = await import('@/lib/streak/service')

      // Act
      const result = await breakStreak(userId)

      // Assert
      expect(result.ok).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('streaks')
    })

    it('データベースエラー時はエラーを返す', async () => {
      // Arrange
      const userId = 'test-user-id'

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'DB connection failed' },
          }),
        }),
      })

      const { breakStreak } = await import('@/lib/streak/service')

      // Act
      const result = await breakStreak(userId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })

  describe('hasEntryOnDate', () => {
    it('指定日に記録が存在する場合はtrueを返す', async () => {
      // Arrange
      const userId = 'test-user-id'
      const date = '2025-12-17'

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 'entry-id' }],
            error: null,
          }),
        }),
      })

      const { hasEntryOnDate } = await import('@/lib/streak/service')

      // Act
      const result = await hasEntryOnDate(userId, date)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(true)
      }
    })

    it('指定日に記録が存在しない場合はfalseを返す', async () => {
      // Arrange
      const userId = 'test-user-id'
      const date = '2025-12-17'

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const { hasEntryOnDate } = await import('@/lib/streak/service')

      // Act
      const result = await hasEntryOnDate(userId, date)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(false)
      }
    })
  })
})
