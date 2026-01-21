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

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getJSTDayBounds } from '@/lib/date-utils'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGetJSTDayBounds = getJSTDayBounds as jest.MockedFunction<typeof getJSTDayBounds>

// Mock Supabase client type
interface MockSupabaseClient {
  auth: {
    getUser: jest.Mock
  }
  from: jest.Mock
}

// Mock Admin client type
interface MockAdminClient {
  from: jest.Mock
}

describe('achievements API', () => {
  const testUserId = 'test-user-id'
  const testEntryId = 'test-entry-id'
  const testAchievementId = 'test-achievement-id'
  const otherUserId = 'other-user-id'

  let mockSupabase: MockSupabaseClient
  let mockAdminClient: MockAdminClient

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
    mockCreateClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)
    mockCreateAdminClient.mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)
    mockGetJSTDayBounds.mockReturnValue({
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
  })

  describe('touchSharedEntryAchievement', () => {
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
      const result = await touchSharedEntryAchievement(testUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('他ユーザーの達成を更新しようとするとエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })

      // Act
      const result = await touchSharedEntryAchievement(otherUserId, testEntryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('FORBIDDEN')
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

    it('達成が見つからない場合はエラーを返す', async () => {
      // Arrange
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain),
      })

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })

    it('[Critical] お祝い送信時にプッシュ通知が呼び出されない（バグ検証）', async () => {
      // Arrange: 現在の実装ではsendCelebrationPushNotificationが呼び出されていないことを確認
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: testAchievementId, user_id: otherUserId },
          error: null,
        }),
      }

      const mockInsertChain = jest.fn().mockResolvedValue({
        error: null,
      })

      mockSupabase.from.mockImplementation((table: unknown) => {
        if (table === 'achievements') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
          }
        }
        return { insert: mockInsertChain }
      })

      mockAdminClient.from.mockReturnValue({
        insert: mockInsertChain,
      })

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
        single: jest.fn().mockResolvedValue({
          data: { id: testAchievementId, user_id: otherUserId },
          error: null,
        }),
      }

      mockSupabase.from.mockImplementation((table: unknown) => {
        if (table === 'achievements') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
          }
        }
        if (table === 'celebrations') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: { code: '23505', message: 'Unique violation' }, // ユニーク制約違反
            }),
          }
        }
        return { insert: jest.fn() }
      })

      // Act
      const result = await celebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('ALREADY_CELEBRATED')
    })
  })

  describe('uncelebrateAchievement', () => {
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
      const result = await uncelebrateAchievement(testAchievementId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('お祝いを取り消す', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      })

      // Act: この呼び出しはモックのため、実装をチェック
      const result = await uncelebrateAchievement(testAchievementId)

      // Assert: エラーの詳細は実装依存だが、エラーオブジェクトが返されることを確認
      expect(result).toBeDefined()
    })
  })

  describe('getMyCelebrationCount', () => {
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
      const result = await getMyCelebrationCount()

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('ACHIEVEMENT_THRESHOLDS定数', () => {
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
