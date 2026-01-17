import { isFollowing, getFollowCounts, getFollowingList, getFollowerList } from '../follows'
import { SOCIAL_PAGINATION } from '../../constants'

// Mock modules
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/safe-action')
jest.mock('@/lib/logger')
jest.mock('@/lib/error-handler')
jest.mock('@/lib/rate-limit')
jest.mock('next/cache')
jest.mock('../push')

const { createClient } = require('@/lib/supabase/server')
const { createAdminClient } = require('@/lib/supabase/admin')

describe('follows API', () => {
  const testUserId = 'user-123'
  const targetUserId = 'user-456'
  const otherUserId = 'user-789'

  let mockSupabase: any
  let mockAdminClient: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }

    mockAdminClient = {
      from: jest.fn(),
    }

    createClient.mockResolvedValue(mockSupabase)
    createAdminClient.mockReturnValue(mockAdminClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('isFollowing', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('フォロー中なら true を返す', async () => {
      // Arrange
      const mockSelectChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'follow-record-id' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectChain),
      })

      // Act
      const result = await isFollowing(targetUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(true)
      }
    })

    it('未フォロー中なら false を返す', async () => {
      // Arrange
      const mockSelectChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectChain),
      })

      // Act
      const result = await isFollowing(targetUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(false)
      }
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await isFollowing(targetUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('DB エラー時は安全なエラーを返す', async () => {
      // Arrange
      const mockSelectChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST', message: 'Database error' },
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectChain),
      })

      // Act
      const result = await isFollowing(targetUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })
  })

  describe('getFollowCounts', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('自分のフォロー数とフォロワー数を取得する', async () => {
      // Arrange
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 42,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 42, // following count
          }),
        }),
      })

      // Mock Promise.all で複数のクエリを処理
      const followingMock = Promise.resolve({
        data: [],
        error: null,
        count: 42,
      })

      const followerMock = Promise.resolve({
        data: [],
        error: null,
        count: 100,
      })

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn()
            .mockResolvedValueOnce(followingMock)
            .mockResolvedValueOnce(followerMock),
        }),
      }))

      // Act
      const result = await getFollowCounts()

      // Assert
      expect(result.ok).toBe(true)
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await getFollowCounts()

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('getFollowingList', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('フォロー中のユーザー一覧を取得（ページネーション）', async () => {
      // Arrange
      const mockUsers = [
        {
          id: 'follow-1',
          created_at: '2025-01-17T10:00:00Z',
          following: {
            id: targetUserId,
            username: 'user_abc',
            display_name: 'User ABC',
            avatar_url: null,
          },
        },
      ]

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectChain)

      // Act
      const result = await getFollowingList()

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.items).toHaveLength(1)
        expect(result.value.items[0].username).toBe('user_abc')
      }
    })

    it('カーソルベースで次ページを取得', async () => {
      // Arrange
      const cursor = '2025-01-17T09:00:00Z'
      const mockUsers = [
        {
          id: 'follow-2',
          created_at: '2025-01-17T08:00:00Z',
          following: {
            id: otherUserId,
            username: 'user_def',
            display_name: 'User DEF',
            avatar_url: null,
          },
        },
      ]

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectChain)

      // Act
      const result = await getFollowingList(cursor)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.items[0].username).toBe('user_def')
      }
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await getFollowingList()

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('hasMore フラグが正確に判定される', async () => {
      // Arrange: SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE + 1 のデータを返す
      const pageSize = SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE
      const users = Array.from({ length: pageSize + 1 }, (_, i) => ({
        id: `follow-${i}`,
        created_at: `2025-01-17T${String(10 - i).padStart(2, '0')}:00:00Z`,
        following: {
          id: `user-${i}`,
          username: `user_${i}`,
          display_name: `User ${i}`,
          avatar_url: null,
        },
      }))

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: users,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectChain)

      // Act
      const result = await getFollowingList()

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.items).toHaveLength(pageSize)
        expect(result.value.nextCursor).not.toBeNull()
      }
    })
  })

  describe('getFollowerList', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      })
    })

    it('フォロワー一覧を取得', async () => {
      // Arrange
      const mockUsers = [
        {
          id: 'follow-1',
          created_at: '2025-01-17T10:00:00Z',
          follower: {
            id: targetUserId,
            username: 'follower_user',
            display_name: 'Follower User',
            avatar_url: null,
          },
        },
      ]

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectChain)

      // Act
      const result = await getFollowerList()

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.items[0].username).toBe('follower_user')
      }
    })

    it('未認証時はエラーを返す', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      // Act
      const result = await getFollowerList()

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('SOCIAL_PAGINATION', () => {
    it('FEED_PAGE_SIZE が定義されている', () => {
      expect(SOCIAL_PAGINATION.FEED_PAGE_SIZE).toBe(20)
    })

    it('NOTIFICATIONS_PAGE_SIZE が定義されている', () => {
      expect(SOCIAL_PAGINATION.NOTIFICATIONS_PAGE_SIZE).toBe(20)
    })

    it('USER_SEARCH_PAGE_SIZE が定義されている', () => {
      expect(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE).toBe(10)
    })
  })
})
