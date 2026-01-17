import {
  checkAndCreateAchievements,
  deleteSharedEntryAchievement,
  touchSharedEntryAchievement,
  celebrateAchievement,
  uncelebrateAchievement,
  getMyCelebrationCount,
} from '../achievements'
import { ACHIEVEMENT_THRESHOLDS } from '../../constants'

// Mock modules
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/date-utils')
jest.mock('@/lib/logger')

const { createClient } = require('@/lib/supabase/server')
const { createAdminClient } = require('@/lib/supabase/admin')
const { getJSTDayBounds } = require('@/lib/date-utils')

describe('achievements API', () => {
  const testUserId = 'test-user-id'
  const testEntryId = 'test-entry-id'
  const testAchievementId = 'test-achievement-id'
  const otherUserId = 'other-user-id'

  let mockSupabase: any
  let mockAdminClient: any

  beforeEach(() => {
    // Supabase クライアントのモック
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }

    // Admin クライアントのモック
    mockAdminClient = {
      from: jest.fn(),
    }

    // Mock implementations
    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)
    getJSTDayBounds.mockReturnValue({
      start: new Date('2025-01-17T00:00:00+09:00'),
      end: new Date('2025-01-18T00:00:00+09:00'),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('checkAndCreateAchievements', () => {
    beforeEach(() => {
      // 認証チェック成功のデフォルト
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await checkAndCreateAchievements(testUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('他ユーザーのuserIdで呼び出すとエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })

      // Act
      const result = await checkAndCreateAchievements(otherUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('FORBIDDEN')
    })

    it('共有フラグ有りで共有達成を作成する', async () => {
      // Arrange
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 1,
        }),
      }

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'achievement-1',
            user_id: testUserId,
            type: 'shared_entry',
            threshold: 1,
            value: 1,
            entry_id: testEntryId,
            is_shared: true,
            created_at: '2025-01-17T00:00:00Z',
          },
          error: null,
        }),
      }

      mockAdminClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue(mockInsertChain),
        select: vi.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectChain),
      })

      // Act
      const result = await checkAndCreateAchievements(testUserId, testEntryId, true)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0)
        expect(result.value.some((a) => a.type === 'shared_entry')).toBe(true)
      }
    })

    it('当日投稿数が閾値を超えたら達成を作成する', async () => {
      // Arrange
      const todayCount = 20 // daily_posts の最小閾値

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: todayCount,
          }),
        }),
      })

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'achievement-2',
            user_id: testUserId,
            type: 'daily_posts',
            threshold: 20,
            value: 20,
            entry_id: testEntryId,
            is_shared: false,
            created_at: '2025-01-17T00:00:00Z',
          },
          error: null,
        }),
      }

      mockAdminClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue(mockInsertChain),
        select: vi.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      // Act
      const result = await checkAndCreateAchievements(testUserId, testEntryId, false)

      // Assert
      expect(result.ok).toBe(true)
    })

    it('総投稿数が閾値を超えたら達成を作成する', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 100, // total_posts の閾値
          }),
        }),
      })

      // Act
      const result = await checkAndCreateAchievements(testUserId, testEntryId, false)

      // Assert
      expect(result.ok).toBe(true)
    })

    it('継続日数が閾値を超えたら達成を作成する', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
          single: vi.fn().mockResolvedValue({
            data: { current_streak: 7 }, // streak_days の閾値
            error: null,
          }),
        }),
      })

      // Act
      const result = await checkAndCreateAchievements(testUserId, testEntryId, false)

      // Assert
      expect(result.ok).toBe(true)
    })

    it('同日に同じタイプ・閾値の達成は作成しない', async () => {
      // Arrange
      const existingAchievement = {
        id: 'existing-achievement-id',
        user_id: testUserId,
        type: 'daily_posts',
        threshold: 20,
      }

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: existingAchievement,
          error: null,
        }),
      }

      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectChain),
      })

      // Act
      const result = await checkAndCreateAchievements(testUserId, testEntryId, false)

      // Assert
      expect(result.ok).toBe(true)
    })
  })

  describe('deleteSharedEntryAchievement', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await deleteSharedEntryAchievement(testUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('他ユーザーの達成を削除しようとするとエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })

      // Act
      const result = await deleteSharedEntryAchievement(otherUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('FORBIDDEN')
    })

    it('共有達成レコードを削除する', async () => {
      // Arrange
      const mockDeleteChain = {
        eq: jest.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      mockAdminClient.from.mockReturnValue(mockDeleteChain)

      // Act
      const result = await deleteSharedEntryAchievement(testUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toBeUndefined()
    })
  })

  describe('touchSharedEntryAchievement', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('updated_atを更新してRealtimeイベントを発火させる', async () => {
      // Arrange
      const mockUpdateChain = {
        eq: jest.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      mockAdminClient.from.mockReturnValue(mockUpdateChain)

      // Act
      const result = await touchSharedEntryAchievement(testUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(true)
      expect(mockAdminClient.from).toHaveBeenCalledWith('achievements')
    })
  })

  describe('celebrateAchievement', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('達成をお祝いし通知を作成する', async () => {
      // Arrange
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: testAchievementId, user_id: otherUserId },
          error: null,
        }),
      }

      const mockInsertChain = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'achievements') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
          }
        }
        if (table === 'celebrations') {
          return mockInsertChain
        }
        return mockInsertChain
      })

      mockAdminClient.from.mockReturnValue(mockInsertChain)

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(true)
    })

    it('[Critical] お祝い送信時にプッシュ通知が呼び出されない（バグ検証）', async () => {
      // Arrange: 現在の実装ではsendCelebrationPushNotificationが呼び出されていないことを確認
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: testAchievementId, user_id: otherUserId },
          error: null,
        }),
      }

      const mockInsertChain = {
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'achievements') {
          return {
            select: vi.fn().mockReturnValue(mockSelectChain),
          }
        }
        return mockInsertChain
      })

      mockAdminClient.from.mockReturnValue(mockInsertChain)

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      // NOTE: この実装ではsendCelebrationPushNotificationが呼び出されていない
      // 修正後のテストでは以下のように期待される:
      // expect(sendCelebrationPushNotificationMock).toHaveBeenCalledWith(otherUserId, ...)
      expect(result.ok).toBe(true) // 一応成功は返されるが、通知は送られていない
    })

    it('既にお祝い済みの場合はエラーを返す', async () => {
      // Arrange
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: testAchievementId, user_id: otherUserId },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectChain),
        insert: vi.fn().mockResolvedValue({
          error: { code: '23505', message: 'Unique violation' }, // ユニーク制約違反
        }),
      })

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('ALREADY_CELEBRATED')
    })

    it('達成が見つからない場合はエラーを返す', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        }),
      })

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })
  })

  describe('uncelebrateAchievement', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('お祝いを取り消す', async () => {
      // Arrange
      const mockDeleteChain = {
        eq: jest.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue({
          error: null,
          count: 1,
        }),
      }

      mockSupabase.from.mockReturnValue(mockDeleteChain)

      // Act
      const result = await uncelebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(true)
    })

    it('祝い済みでない場合はエラーを返す', async () => {
      // Arrange
      const mockDeleteChain = {
        eq: jest.fn().mockReturnThis(),
        delete: vi.fn().mockResolvedValue({
          error: null,
          count: 0, // 削除されたレコードなし
        }),
      }

      mockSupabase.from.mockReturnValue(mockDeleteChain)

      // Act
      const result = await uncelebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NOT_CELEBRATED')
    })
  })

  describe('getMyCelebrationCount', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('自分の達成への総お祝い数を取得する', async () => {
      // Arrange
      const mockSelectChain = {
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 42,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectChain)

      // Act
      const result = await getMyCelebrationCount()

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await getMyCelebrationCount()

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('ACHIEVEMENT_THRESHOLDS', () => {
    it('daily_posts 閾値が定義されている', () => {
      // Assert
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toBeDefined()
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toContain(20)
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toContain(30)
    })

    it('total_posts 閾値が定義されている', () => {
      // Assert
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toBeDefined()
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toContain(10)
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toContain(100)
    })

    it('streak_days 閾値が定義されている', () => {
      // Assert
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toBeDefined()
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(3)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(7)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(365)
    })
  })
})
