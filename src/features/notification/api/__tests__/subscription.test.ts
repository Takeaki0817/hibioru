import {
  subscribe,
  unsubscribe,
  getSubscriptions,
  removeInvalidSubscription,
} from '@/lib/push/subscription'
import type { PushSubscriptionInput } from '@/lib/push/subscription'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Push Subscription Service', () => {
  const mockUserId = 'test-user-123'
  const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint'

  const mockSubscriptionInput: PushSubscriptionInput = {
    endpoint: mockEndpoint,
    keys: {
      p256dh: 'base64-encoded-p256dh-key',
      auth: 'base64-encoded-auth-key',
    },
    userAgent: 'Mozilla/5.0 (Test Browser)',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('subscribe', () => {
    it('購読登録成功', async () => {
      // Arrange
      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'sub-123',
          user_id: mockUserId,
          endpoint: mockEndpoint,
          p256dh: 'base64-encoded-p256dh-key',
          auth: 'base64-encoded-auth-key',
          user_agent: 'Mozilla/5.0 (Test Browser)',
          created_at: '2025-01-17T00:00:00Z',
        },
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
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
      }
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    })

    it('重複購読の防止 (23505エラー)', async () => {
      // Arrange
      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate endpoint' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
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
      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database connection failed' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })

      mockInsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await subscribe(mockUserId, mockSubscriptionInput)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
      }
    })
  })

  describe('unsubscribe', () => {
    it('購読解除成功', async () => {
      // Arrange
      const mockDelete = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await unsubscribe(mockUserId, mockEndpoint)

      // Assert
      expect(result.ok).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    })

    it('購読解除失敗 (DB接続エラー)', async () => {
      // Arrange
      const mockDelete = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await unsubscribe(mockUserId, mockEndpoint)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
      }
    })

    it('べき等性: 存在しないエンドポイントの削除', async () => {
      // Arrange
      const mockDelete = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq1,
      })

      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await unsubscribe(mockUserId, 'non-existent-endpoint')

      // Assert
      expect(result.ok).toBe(true)
    })
  })

  describe('getSubscriptions', () => {
    it('購読情報取得成功', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'sub-123',
            endpoint: mockEndpoint,
            p256dh: 'key1',
            auth: 'auth1',
          },
        ],
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getSubscriptions(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(1)
        expect(result.value[0].id).toBe('sub-123')
        expect(result.value[0].endpoint).toBe(mockEndpoint)
      }
    })

    it('購読情報がない場合 (空配列返却)', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      (createClient as jest.Mock).mockResolvedValue({
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
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getSubscriptions(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
      }
    })
  })

  describe('removeInvalidSubscription', () => {
    it('無効な購読を削除成功', async () => {
      // Arrange
      const subscriptionId = 'sub-invalid-123'
      const mockDelete = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await removeInvalidSubscription(subscriptionId, '410 Gone')

      // Assert
      expect(result.ok).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
      expect(mockEq).toHaveBeenCalledWith('id', subscriptionId)
    })

    it('無効な購読削除失敗 (DB接続エラー)', async () => {
      // Arrange
      const subscriptionId = 'sub-invalid-123'
      const mockDelete = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
      })

      mockDelete.mockReturnValue({
        eq: mockEq,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await removeInvalidSubscription(subscriptionId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
      }
    })
  })
})
