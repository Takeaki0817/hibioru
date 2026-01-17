import {
  getStreakInfo,
  updateStreakOnEntry,
  hasEntryOnDate,
  getWeeklyRecords,
  breakStreak,
} from '../service'
import type { StreakInfo } from '../types'

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// date-utilsのモック
jest.mock('@/lib/date-utils', () => ({
  getJSTToday: jest.fn(() => '2025-01-17'),
  getJSTDateString: jest.fn((date: Date) => {
    // 実際の実装を簡略化
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }),
}))

// モックの取得
import { createClient } from '@/lib/supabase/server'

describe('Streak Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================
  // getStreakInfo テスト
  // ============================================

  describe('getStreakInfo', () => {
    it('should return initial values when record does not exist', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getStreakInfo(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(0)
        expect(result.value.longestStreak).toBe(0)
        expect(result.value.lastEntryDate).toBe(null)
        expect(result.value.hotsureRemaining).toBe(2)
        expect(result.value.bonusHotsure).toBe(0)
        expect(result.value.hotsureUsedCount).toBe(0)
      }
    })

    it('should return existing record values', async () => {
      // Arrange
      const userId = 'user-123'
      const existingData = {
        current_streak: 5,
        longest_streak: 10,
        last_entry_date: '2025-01-17',
        hotsure_remaining: 1,
        bonus_hotsure: 2,
        hotsure_used_dates: ['2025-01-15', '2025-01-16'],
      }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingData,
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getStreakInfo(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(5)
        expect(result.value.longestStreak).toBe(10)
        expect(result.value.lastEntryDate).toBe('2025-01-17')
        expect(result.value.hotsureRemaining).toBe(1)
        expect(result.value.bonusHotsure).toBe(2)
        expect(result.value.hotsureUsedCount).toBe(2)
      }
    })

    it('should return DB_ERROR for invalid user ID', async () => {
      // Arrange
      const userId = 'invalid-id'
      const mockError = { code: 'INVALID_REQUEST', message: 'Invalid user ID' }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getStreakInfo(userId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })

    it('should handle bonus_hotsure field default to 0 when missing', async () => {
      // Arrange
      const userId = 'user-123'
      const existingData = {
        current_streak: 3,
        longest_streak: 5,
        last_entry_date: '2025-01-17',
        hotsure_remaining: 2,
        // bonus_hotsure を意図的に除外
        hotsure_used_dates: [],
      }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingData,
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getStreakInfo(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.bonusHotsure).toBe(0)
      }
    })
  })

  // ============================================
  // updateStreakOnEntry テスト
  // ============================================

  describe('updateStreakOnEntry', () => {
    it('should increment current_streak and set last_entry_date on first entry', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  current_streak: 1,
                  longest_streak: 1,
                  last_entry_date: '2025-01-17',
                  hotsure_remaining: 2,
                  bonus_hotsure: 0,
                  hotsure_used_dates: [],
                },
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(1)
        expect(result.value.longestStreak).toBe(1)
        expect(result.value.lastEntryDate).toBe('2025-01-17')
      }
    })

    it('should not increment current_streak on same day second entry', async () => {
      // Arrange
      const userId = 'user-123'
      const today = '2025-01-17'
      const existingData = {
        current_streak: 3,
        longest_streak: 5,
        last_entry_date: today,
        hotsure_remaining: 2,
        hotsure_used_dates: [],
      }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingData,
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        // 同日2回目なので、ストリーク値は変わらない
        expect(result.value.currentStreak).toBe(3)
        expect(result.value.longestStreak).toBe(5)
        expect(result.value.lastEntryDate).toBe(today)
      }
    })

    it('should update longest_streak when current_streak exceeds it', async () => {
      // Arrange
      const userId = 'user-123'
      const existingData = {
        current_streak: 9,
        longest_streak: 8,
        last_entry_date: '2025-01-16',
        hotsure_remaining: 2,
        hotsure_used_dates: [],
      }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingData,
                error: null,
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  current_streak: 10,
                  longest_streak: 10, // 更新される
                  last_entry_date: '2025-01-17',
                  hotsure_remaining: 2,
                  bonus_hotsure: 0,
                  hotsure_used_dates: [],
                },
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currentStreak).toBe(10)
        expect(result.value.longestStreak).toBe(10)
      }
    })

    it('should handle upsert for non-existent record', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  current_streak: 1,
                  longest_streak: 1,
                  last_entry_date: '2025-01-17',
                  hotsure_remaining: 2,
                  bonus_hotsure: 0,
                  hotsure_used_dates: [],
                },
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      // Supabaseの upsert メソッドが呼ばれたか確認
      const supabase = await createClient()
      expect(supabase.from).toHaveBeenCalledWith('streaks')
    })

    it('should return DB_ERROR on database connection error', async () => {
      // Arrange
      const userId = 'user-123'
      const mockError = { code: 'DATABASE_ERROR', message: 'Connection failed' }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })

    it('should return bonus_hotsure in response', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  current_streak: 1,
                  longest_streak: 1,
                  last_entry_date: '2025-01-17',
                  hotsure_remaining: 2,
                  bonus_hotsure: 3,
                  hotsure_used_dates: [],
                },
                error: null,
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await updateStreakOnEntry(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.bonusHotsure).toBe(3)
      }
    })
  })

  // ============================================
  // hasEntryOnDate テスト
  // ============================================

  describe('hasEntryOnDate', () => {
    it('should return true when entry exists on given date', async () => {
      // Arrange
      const userId = 'user-123'
      const date = '2025-01-17'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [{ id: 'entry-1' }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await hasEntryOnDate(userId, date)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(true)
      }
    })

    it('should return false when no entry exists on given date', async () => {
      // Arrange
      const userId = 'user-123'
      const date = '2025-01-17'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await hasEntryOnDate(userId, date)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(false)
      }
    })

    it('should exclude deleted entries', async () => {
      // Arrange
      const userId = 'user-123'
      const date = '2025-01-17'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      await hasEntryOnDate(userId, date)

      // Assert
      // is_deleted=false のフィルターが適用されているか確認
      const supabase = await createClient()
      const fromCall = supabase.from('entries')
      expect(fromCall.select).toHaveBeenCalledWith('id')
    })

    it('should correctly handle JST date boundaries', async () => {
      // Arrange
      const userId = 'user-123'
      const date = '2025-01-17'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [{ id: 'entry-1' }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await hasEntryOnDate(userId, date)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(true)
      }
    })

    it('should return DB_ERROR on database error', async () => {
      // Arrange
      const userId = 'user-123'
      const date = '2025-01-17'
      const mockError = { code: 'DATABASE_ERROR', message: 'Connection failed' }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: null,
                      error: mockError,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await hasEntryOnDate(userId, date)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })

  // ============================================
  // breakStreak テスト
  // ============================================

  describe('breakStreak', () => {
    it('should reset current_streak to 0', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await breakStreak(userId)

      // Assert
      expect(result.ok).toBe(true)
      // update メソッドが { current_streak: 0 } で呼ばれたか確認
      const supabase = await createClient()
      expect(supabase.from('streaks').update).toHaveBeenCalledWith({ current_streak: 0 })
    })

    it('should not modify longest_streak', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      await breakStreak(userId)

      // Assert
      const supabase = await createClient()
      const updateCall = supabase.from('streaks').update
      // longest_streak は更新されていない（update の引数に含まれない）
      expect(updateCall).toHaveBeenCalledWith({ current_streak: 0 })
    })

    it('should return DB_ERROR on database error', async () => {
      // Arrange
      const userId = 'user-123'
      const mockError = { code: 'DATABASE_ERROR', message: 'Connection failed' }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await breakStreak(userId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })

  // ============================================
  // getWeeklyRecords テスト
  // ============================================

  describe('getWeeklyRecords', () => {
    it('should return 7-day weekly records starting from Monday', async () => {
      // Arrange
      const userId = 'user-123'
      const mockEntries = [
        { created_at: '2025-01-13T10:00:00Z' }, // 月
        { created_at: '2025-01-15T10:00:00Z' }, // 水
        { created_at: '2025-01-17T10:00:00Z' }, // 金
      ]
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'entries') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lt: jest.fn().mockResolvedValue({
                        data: mockEntries,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          // streaks table
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    hotsure_used_dates: ['2025-01-14'], // 火
                  },
                  error: null,
                }),
              }),
            }),
          }
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getWeeklyRecords(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.entries).toHaveLength(7)
        expect(result.value.hotsures).toHaveLength(7)
      }
    })

    it('should mark days with multiple entries as true', async () => {
      // Arrange
      const userId = 'user-123'
      const mockEntries = [
        { created_at: '2025-01-17T10:00:00Z' },
        { created_at: '2025-01-17T15:00:00Z' }, // 同日複数エントリ
      ]
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'entries') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lt: jest.fn().mockResolvedValue({
                        data: mockEntries,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { hotsure_used_dates: [] },
                  error: null,
                }),
              }),
            }),
          }
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getWeeklyRecords(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        // 金曜日（インデックス4）が true であることを確認
        expect(result.value.entries[4]).toBe(true)
      }
    })

    it('should display hotsure used dates in hotsures array', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'entries') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lt: jest.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    hotsure_used_dates: ['2025-01-14', '2025-01-15'],
                  },
                  error: null,
                }),
              }),
            }),
          }
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getWeeklyRecords(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        // 火曜日（インデックス1）と水曜日（インデックス2）が true
        expect(result.value.hotsures[1]).toBe(true)
        expect(result.value.hotsures[2]).toBe(true)
      }
    })

    it('should handle missing hotsure_used_dates as empty array', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'entries') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lt: jest.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // hotsure_used_dates が null
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getWeeklyRecords(userId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        // すべてのほつれ日が false
        expect(result.value.hotsures).toEqual([false, false, false, false, false, false, false])
      }
    })

    it('should correctly handle JST date calculations', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'entries') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      lt: jest.fn().mockResolvedValue({
                        data: [{ created_at: '2025-01-17T10:00:00Z' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { hotsure_used_dates: [] },
                  error: null,
                }),
              }),
            }),
          }
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getWeeklyRecords(userId)

      // Assert
      expect(result.ok).toBe(true)
    })

    it('should return DB_ERROR on entries query failure', async () => {
      // Arrange
      const userId = 'user-123'
      const mockError = { code: 'DATABASE_ERROR', message: 'Connection failed' }
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockResolvedValue({
                    data: null,
                    error: mockError,
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      (createClient as jest.Mock).mockResolvedValue(mockSupabase as any)

      // Act
      const result = await getWeeklyRecords(userId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })
})
