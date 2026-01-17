import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  subscribe,
  unsubscribe,
  getSubscriptions,
  removeInvalidSubscription,
} from '@/lib/push/subscription'
import type { PushSubscriptionInput, PushSubscription } from '@/lib/push/subscription'

// Supabaseクライアントのモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Push Subscription Service', () => {
  const mockUserId = 'test-user-123'
  const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint'
  const mockUserAgent = 'Mozilla/5.0 (Test Browser)'

  const mockSubscriptionInput: PushSubscriptionInput = {
    endpoint: mockEndpoint,
    keys: {
      p256dh: 'base64-encoded-p256dh-key',
      auth: 'base64-encoded-auth-key',
    },
    userAgent: mockUserAgent,
  }

  const mockSubscriptionData: PushSubscription = {
    id: 'sub-123',
    userId: mockUserId,
    endpoint: mockEndpoint,
    p256dhKey: 'base64-encoded-p256dh-key',
    authKey: 'base64-encoded-auth-key',
    userAgent: mockUserAgent,
    createdAt: new Date('2025-01-17T00:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('subscribe', () => {
    it('購読登録成功', async () => {
      // Arrange
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'sub-123',
          user_id: mockUserId,
          endpoint: mockEndpoint,
          p256dh: 'base64-encoded-p256dh-key',
          auth: 'base64-encoded-auth-key',
          user_agent: mockUserAgent,
          created_at: '2025-01-17T00:00:00Z',
        },
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await subscribe(mockUserId, mockSubscriptionInput)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('sub-123')
        expect(result.value.userId).toBe(mockUserId)
        expect(result.value.endpoint).toBe(mockEndpoint)
        expect(result.value.p256dhKey).toBe('base64-encoded-p256dh-key')
        expect(result.value.authKey).toBe('base64-encoded-auth-key')
        expect(result.value.userAgent).toBe(mockUserAgent)
      }
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    })

    it('重複購読の防止 (23505エラー)', async () => {
      // Arrange
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate endpoint' },
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await subscribe(mockUserId, mockSubscriptionInput)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DUPLICATE_ENDPOINT')
      }
    })

    it('購読登録失敗 (DB接続エラー)', async () => {
      // Arrange
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database connection failed' },
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await subscribe(mockUserId, mockSubscriptionInput)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Database connection failed')
      }
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected subscription error')
      )

      // Act
      const result = await subscribe(mockUserId, mockSubscriptionInput)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Unexpected subscription error')
      }
    })
  })

  describe('unsubscribe', () => {
    it('購読解除成功', async () => {
      // Arrange
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await unsubscribe(mockUserId, mockEndpoint)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toBeUndefined()
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
      expect(mockEq1).toHaveBeenCalledWith('user_id', mockUserId)
    })

    it('購読解除失敗 (DB接続エラー)', async () => {
      // Arrange
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockResolvedValue({
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await unsubscribe(mockUserId, mockEndpoint)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Database error')
      }
    })

    it('べき等性: 存在しないエンドポイントの削除', async () => {
      // Arrange
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null, // エラーなし（Supabaseは0行削除時もエラーにしない）
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await unsubscribe(mockUserId, 'non-existent-endpoint')

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toBeUndefined()
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected error')
      )

      // Act
      const result = await unsubscribe(mockUserId, mockEndpoint)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Unexpected error')
      }
    })
  })

  describe('getSubscriptions', () => {
    it('購読情報取得成功', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'sub-123',
            endpoint: mockEndpoint,
            p256dh: 'key1',
            auth: 'auth1',
          },
          {
            id: 'sub-456',
            endpoint: 'https://fcm.googleapis.com/fcm/send/second-endpoint',
            p256dh: 'key2',
            auth: 'auth2',
          },
        ],
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getSubscriptions(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].id).toBe('sub-123')
        expect(result.value[0].endpoint).toBe(mockEndpoint)
        expect(result.value[0].p256dhKey).toBe('key1')
        expect(result.value[0].authKey).toBe('auth1')
        expect(result.value[1].id).toBe('sub-456')
      }
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    })

    it('購読情報がない場合 (空配列返却)', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getSubscriptions(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(0)
      }
    })

    it('購読情報取得失敗 (DB接続エラー)', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getSubscriptions(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Database error')
      }
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected error')
      )

      // Act
      const result = await getSubscriptions(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Unexpected error')
      }
    })
  })

  describe('removeInvalidSubscription', () => {
    it('無効な購読を削除成功', async () => {
      // Arrange
      const subscriptionId = 'sub-invalid-123'
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await removeInvalidSubscription(subscriptionId, '410 Gone')

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toBeUndefined()
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
      expect(mockEq).toHaveBeenCalledWith('id', subscriptionId)
    })

    it('無効な購読削除失敗 (DB接続エラー)', async () => {
      // Arrange
      const subscriptionId = 'sub-invalid-123'
      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await removeInvalidSubscription(subscriptionId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Database error')
      }
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected error')
      )

      // Act
      const result = await removeInvalidSubscription('sub-123')

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Unexpected error')
      }
    })
  })
})
