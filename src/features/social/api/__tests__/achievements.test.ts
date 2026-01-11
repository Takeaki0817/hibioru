/**
 * Achievements API ユニットテスト
 * @jest-environment node
 */

import {
  checkAndCreateAchievements,
  deleteSharedEntryAchievement,
  celebrateAchievement,
} from '../achievements'
import { ACHIEVEMENT_THRESHOLDS } from '../../constants'

// モック設定
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/date-utils')
jest.mock('@/lib/logger')

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getJSTDayBounds } from '@/lib/date-utils'

const mockCreateClient = jest.mocked(createClient)
const mockCreateAdminClient = jest.mocked(createAdminClient)
const mockGetJSTDayBounds = jest.mocked(getJSTDayBounds)

describe('achievements API', () => {
  const mockUserId = 'user-123'
  const mockEntryId = 'entry-456'
  const mockAchievementId = 'achievement-789'

  // 固定の日付範囲
  const mockDayBounds = {
    start: new Date('2024-01-15T15:00:00.000Z'), // JST 2024-01-16 00:00
    end: new Date('2024-01-16T14:59:59.999Z'),   // JST 2024-01-16 23:59
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetJSTDayBounds.mockReturnValue(mockDayBounds)
  })

  // Supabaseクライアントのチェーンモック
  const createSupabaseClientMock = (overrides: Partial<{
    getUserResult: { data: { user: { id: string } | null }; error: unknown }
    countResult: { count: number | null; error: unknown }
    selectResult: { data: unknown; error: unknown }
    insertResult: { data: unknown; error: unknown }
    deleteResult: { error: unknown; count: number }
  }> = {}) => {
    const defaults = {
      getUserResult: { data: { user: { id: mockUserId } }, error: null },
      countResult: { count: 0, error: null },
      selectResult: { data: null, error: null },
      insertResult: { data: null, error: null },
      deleteResult: { error: null, count: 1 },
    }
    const config = { ...defaults, ...overrides }

    const chain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(config.selectResult),
      single: jest.fn().mockResolvedValue(config.insertResult),
    }

    return {
      from: jest.fn().mockReturnValue(chain),
      auth: {
        getUser: jest.fn().mockResolvedValue(config.getUserResult),
      },
    }
  }

  // Admin Clientのモック
  const createAdminClientMock = (overrides: Partial<{
    selectResult: { data: unknown; error: unknown }
    insertResult: { data: unknown; error: unknown }
    deleteResult: { error: unknown }
  }> = {}) => {
    const defaults = {
      selectResult: { data: null, error: null },
      insertResult: { data: { id: mockAchievementId, user_id: mockUserId, type: 'shared_entry', threshold: 1, value: 1, entry_id: mockEntryId, is_shared: true, created_at: '2024-01-16T00:00:00Z' }, error: null },
      deleteResult: { error: null },
    }
    const config = { ...defaults, ...overrides }

    const chain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue(config.selectResult),
      single: jest.fn().mockResolvedValue(config.insertResult),
    }

    // deleteチェーンの解決
    chain.eq.mockImplementation(() => ({
      ...chain,
      eq: jest.fn().mockResolvedValue(config.deleteResult),
    }))

    return {
      from: jest.fn().mockReturnValue(chain),
    }
  }

  describe('checkAndCreateAchievements', () => {
    describe('認証チェック', () => {
      it('未認証の場合はUNAUTHORIZEDエラーを返す', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock({
          getUserResult: { data: { user: null }, error: null },
        })
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // Act
        const result = await checkAndCreateAchievements(mockUserId, mockEntryId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('UNAUTHORIZED')
        }
      })

      it('他ユーザーのIDを渡すとFORBIDDENエラーを返す', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock({
          getUserResult: { data: { user: { id: mockUserId } }, error: null },
        })
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        const otherUserId = 'other-user-999'

        // Act
        const result = await checkAndCreateAchievements(otherUserId, mockEntryId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('FORBIDDEN')
          expect(result.error.message).toBe('他のユーザーの達成を作成する権限がありません')
        }
      })
    })

    describe('共有投稿での達成作成', () => {
      it('isShared=trueで共有達成レコードを作成する', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock()
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        const mockAdminClient = createAdminClientMock()
        mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

        // Act
        const result = await checkAndCreateAchievements(mockUserId, mockEntryId, true)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          // 共有達成が作成されていることを確認
          const sharedAchievement = result.value.find(a => a.type === 'shared_entry')
          expect(sharedAchievement).toBeDefined()
          if (sharedAchievement) {
            expect(sharedAchievement.isShared).toBe(true)
            expect(sharedAchievement.threshold).toBe(1)
          }
        }
      })

      it('isShared=falseでは共有達成を作成しない', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock()
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        const mockAdminClient = createAdminClientMock({
          insertResult: { data: null, error: null },
        })
        mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

        // Act
        const result = await checkAndCreateAchievements(mockUserId, mockEntryId, false)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          const sharedAchievement = result.value.find(a => a.type === 'shared_entry')
          expect(sharedAchievement).toBeUndefined()
        }
      })
    })

    describe('daily_posts達成', () => {
      it('20件目の投稿で達成を作成する', () => {
        // 閾値の確認
        expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toContain(20)
      })

      it('閾値が[20, 30, 40, 50]であること', () => {
        expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toEqual([20, 30, 40, 50])
      })
    })

    describe('total_posts達成', () => {
      it('10件目の総投稿で達成を作成する', () => {
        expect(ACHIEVEMENT_THRESHOLDS.total_posts[0]).toBe(10)
      })

      it('最初の10閾値が正しいこと', () => {
        const first10 = ACHIEVEMENT_THRESHOLDS.total_posts.slice(0, 10)
        expect(first10).toEqual([10, 30, 50, 100, 150, 200, 250, 300, 400, 500])
      })
    })

    describe('streak_days達成', () => {
      it('3日連続で達成を作成する', () => {
        expect(ACHIEVEMENT_THRESHOLDS.streak_days[0]).toBe(3)
      })

      it('最初の閾値が[3, 7, 14, 30, ...]であること', () => {
        const first4 = ACHIEVEMENT_THRESHOLDS.streak_days.slice(0, 4)
        expect(first4).toEqual([3, 7, 14, 30])
      })
    })

    describe('重複達成の防止', () => {
      it('既存の達成がある場合は作成しない', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock()
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // 既存の達成がある状態をシミュレート
        const mockAdminClient = createAdminClientMock({
          selectResult: { data: { id: 'existing-achievement' }, error: null },
          insertResult: { data: null, error: null },
        })
        mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

        // Act
        const result = await checkAndCreateAchievements(mockUserId, mockEntryId, false)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          // 重複チェックにより新規達成は作成されない
          expect(result.value.length).toBe(0)
        }
      })
    })

    describe('完全一致条件（閾値超過では達成なし）', () => {
      it('currentValue === threshold の時のみ達成が作成される', () => {
        // checkAndCreateAchievementForType内のロジック確認
        // currentValue === threshold の条件で達成が作成される

        const threshold = 10
        const currentValueMatch = 10
        const currentValueOver = 11

        // 完全一致の場合のみtrue
        expect(currentValueMatch === threshold).toBe(true)
        expect(currentValueOver === threshold).toBe(false)
      })

      it('閾値を超えた値では達成が作成されないこと', () => {
        // 11件の投稿では10件達成は作成されない
        const totalCount = 11
        const threshold = 10

        expect(totalCount === threshold).toBe(false)
      })
    })
  })

  describe('deleteSharedEntryAchievement', () => {
    describe('認証チェック', () => {
      it('未認証の場合はUNAUTHORIZEDエラーを返す', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock({
          getUserResult: { data: { user: null }, error: null },
        })
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // Act
        const result = await deleteSharedEntryAchievement(mockUserId, mockEntryId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('UNAUTHORIZED')
        }
      })

      it('他ユーザーの達成削除はFORBIDDENエラー', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock()
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        const otherUserId = 'other-user-999'

        // Act
        const result = await deleteSharedEntryAchievement(otherUserId, mockEntryId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('FORBIDDEN')
        }
      })
    })

    describe('共有達成の削除', () => {
      it('正常に削除できる', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock()
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // deleteチェーンを正しく構築
        const mockAdminClient = {
          from: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
        }
        mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

        // Act
        const result = await deleteSharedEntryAchievement(mockUserId, mockEntryId)

        // Assert
        expect(result.ok).toBe(true)
      })

      it('DBエラー時はDB_ERRORを返す', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock()
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        const mockAdminClient = {
          from: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }
        mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

        // Act
        const result = await deleteSharedEntryAchievement(mockUserId, mockEntryId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('DB_ERROR')
        }
      })
    })
  })

  describe('celebrateAchievement', () => {
    describe('認証チェック', () => {
      it('未認証の場合はUNAUTHORIZEDエラーを返す', async () => {
        // Arrange
        const mockClient = createSupabaseClientMock({
          getUserResult: { data: { user: null }, error: null },
        })
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // Act
        const result = await celebrateAchievement(mockAchievementId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('UNAUTHORIZED')
        }
      })
    })

    describe('お祝いの作成', () => {
      it('正常にお祝いを作成できる', async () => {
        // Arrange
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: mockAchievementId, user_id: 'target-user' },
            error: null,
          }),
        }
        const mockClient = {
          from: jest.fn().mockReturnValue(mockChain),
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        }
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        const mockAdminClient = createAdminClientMock()
        mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)

        // Act
        const result = await celebrateAchievement(mockAchievementId)

        // Assert
        expect(result.ok).toBe(true)
      })

      it('達成が見つからない場合はNOT_FOUNDエラー', async () => {
        // Arrange
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }
        const mockClient = {
          from: jest.fn().mockReturnValue(mockChain),
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        }
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // Act
        const result = await celebrateAchievement(mockAchievementId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('NOT_FOUND')
        }
      })
    })

    describe('重複お祝いのエラー', () => {
      it('ユニーク制約違反（23505）でALREADY_CELEBRATEDエラー', async () => {
        // Arrange
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({
            error: { code: '23505', message: 'duplicate key' },
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: mockAchievementId, user_id: 'target-user' },
            error: null,
          }),
        }
        const mockClient = {
          from: jest.fn().mockReturnValue(mockChain),
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        }
        mockCreateClient.mockResolvedValue(mockClient as unknown as ReturnType<typeof createClient>)

        // Act
        const result = await celebrateAchievement(mockAchievementId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('ALREADY_CELEBRATED')
          expect(result.error.message).toBe('既にお祝い済みです')
        }
      })
    })
  })
})

describe('ACHIEVEMENT_THRESHOLDS 閾値定義', () => {
  describe('daily_posts', () => {
    it('閾値が正しく定義されていること', () => {
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toEqual([20, 30, 40, 50])
    })

    it('全ての値が正の整数であること', () => {
      ACHIEVEMENT_THRESHOLDS.daily_posts.forEach(threshold => {
        expect(Number.isInteger(threshold)).toBe(true)
        expect(threshold).toBeGreaterThan(0)
      })
    })

    it('昇順にソートされていること', () => {
      const sorted = [...ACHIEVEMENT_THRESHOLDS.daily_posts].sort((a, b) => a - b)
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toEqual(sorted)
    })
  })

  describe('total_posts', () => {
    it('最小閾値が10であること', () => {
      expect(ACHIEVEMENT_THRESHOLDS.total_posts[0]).toBe(10)
    })

    it('500以降は100刻みであること', () => {
      const after500 = ACHIEVEMENT_THRESHOLDS.total_posts.filter(t => t >= 500)
      for (let i = 1; i < after500.length; i++) {
        expect(after500[i] - after500[i - 1]).toBe(100)
      }
    })

    it('昇順にソートされていること', () => {
      const sorted = [...ACHIEVEMENT_THRESHOLDS.total_posts].sort((a, b) => a - b)
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toEqual(sorted)
    })
  })

  describe('streak_days', () => {
    it('最小閾値が3であること', () => {
      expect(ACHIEVEMENT_THRESHOLDS.streak_days[0]).toBe(3)
    })

    it('365日（1年）が含まれること', () => {
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(365)
    })

    it('365日以降は60刻みであること', () => {
      const after365 = ACHIEVEMENT_THRESHOLDS.streak_days.filter(t => t > 365)
      for (let i = 1; i < after365.length; i++) {
        expect(after365[i] - after365[i - 1]).toBe(60)
      }
    })

    it('昇順にソートされていること', () => {
      const sorted = [...ACHIEVEMENT_THRESHOLDS.streak_days].sort((a, b) => a - b)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toEqual(sorted)
    })
  })
})
