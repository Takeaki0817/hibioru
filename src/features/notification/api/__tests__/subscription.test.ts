/**
 * 購読管理サービスのテスト
 * @jest-environment node
 */

import {
  subscribe,
  unsubscribe,
  getSubscriptions,
  removeInvalidSubscription,
} from '@/lib/push/subscription'
import { createClient } from '@/lib/supabase/server'

// モック設定
jest.mock('@/lib/supabase/server')
const mockCreateClient = jest.mocked(createClient)

describe('push/subscription', () => {
  const mockUserId = 'test-user-123'
  const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/abc123'
  const mockSubscriptionInput = {
    endpoint: mockEndpoint,
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
    userAgent: 'Mozilla/5.0',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('subscribe', () => {
    // チェーンモックを作成するヘルパー関数
    const createInsertChainMock = (finalResult: { data: unknown; error: unknown }) => {
      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(finalResult),
      }
      return {
        from: jest.fn().mockReturnValue(chain),
        auth: { getUser: jest.fn() },
      }
    }

    describe('正常系', () => {
      it('購読情報を正常に登録できること', async () => {
        // Arrange
        const mockRow = {
          id: 'subscription-id-123',
          user_id: mockUserId,
          endpoint: mockEndpoint,
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
          user_agent: 'Mozilla/5.0',
          created_at: '2025-01-12T00:00:00Z',
        }
        const mockClient = createInsertChainMock({ data: mockRow, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await subscribe(mockUserId, mockSubscriptionInput)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toBe('subscription-id-123')
          expect(result.value.userId).toBe(mockUserId)
          expect(result.value.endpoint).toBe(mockEndpoint)
          expect(result.value.p256dhKey).toBe('test-p256dh-key')
          expect(result.value.authKey).toBe('test-auth-key')
          expect(result.value.userAgent).toBe('Mozilla/5.0')
          expect(result.value.createdAt).toBeInstanceOf(Date)
        }
      })

      it('userAgentがない場合もnullで登録できること', async () => {
        // Arrange
        const subscriptionWithoutUserAgent = {
          endpoint: mockEndpoint,
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
        }
        const mockRow = {
          id: 'subscription-id-123',
          user_id: mockUserId,
          endpoint: mockEndpoint,
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
          user_agent: null,
          created_at: '2025-01-12T00:00:00Z',
        }
        const mockClient = createInsertChainMock({ data: mockRow, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await subscribe(mockUserId, subscriptionWithoutUserAgent)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.userAgent).toBeNull()
        }
      })
    })

    describe('異常系', () => {
      it('重複エンドポイントの場合はDUPLICATE_ENDPOINTを返すこと', async () => {
        // Arrange - PostgreSQLの一意制約違反エラーコード
        const mockClient = createInsertChainMock({
          data: null,
          error: { code: '23505', message: 'duplicate key value' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await subscribe(mockUserId, mockSubscriptionInput)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DUPLICATE_ENDPOINT')
        }
      })

      it('データベースエラー時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        const mockClient = createInsertChainMock({
          data: null,
          error: { code: 'OTHER_ERROR', message: 'Connection failed' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await subscribe(mockUserId, mockSubscriptionInput)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Connection failed')
        }
      })

      it('予期しない例外時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue(new Error('Unexpected exception'))

        // Act
        const result = await subscribe(mockUserId, mockSubscriptionInput)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Unexpected exception')
        }
      })

      it('非Errorオブジェクトの例外時は「不明なエラー」を返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue('string error')

        // Act
        const result = await subscribe(mockUserId, mockSubscriptionInput)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', '不明なエラー')
        }
      })
    })
  })

  describe('unsubscribe', () => {
    // チェーンモックを作成するヘルパー関数
    const createDeleteChainMock = (finalResult: { error: unknown }) => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }
      // 最後のeqでfinalResultを返す
      chain.eq = jest.fn().mockImplementation(() => {
        return Promise.resolve(finalResult)
      })
      // 最初のeqはチェーンを返す
      const firstEq = jest.fn().mockReturnValue({
        eq: chain.eq,
      })
      chain.eq = firstEq

      return {
        from: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: firstEq,
          }),
        }),
        auth: { getUser: jest.fn() },
      }
    }

    describe('正常系', () => {
      it('購読情報を正常に削除できること', async () => {
        // Arrange
        const mockClient = createDeleteChainMock({ error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await unsubscribe(mockUserId, mockEndpoint)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBeUndefined()
        }
      })

      it('存在しないエンドポイントの削除もエラーにならないこと（べき等性）', async () => {
        // Arrange - 削除対象がなくてもエラーにならない
        const mockClient = createDeleteChainMock({ error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await unsubscribe(mockUserId, 'non-existent-endpoint')

        // Assert
        expect(result.ok).toBe(true)
      })
    })

    describe('異常系', () => {
      it('データベースエラー時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        const mockClient = createDeleteChainMock({
          error: { code: 'ERROR', message: 'Delete failed' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await unsubscribe(mockUserId, mockEndpoint)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Delete failed')
        }
      })

      it('予期しない例外時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue(new Error('Connection lost'))

        // Act
        const result = await unsubscribe(mockUserId, mockEndpoint)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Connection lost')
        }
      })
    })
  })

  describe('getSubscriptions', () => {
    // チェーンモックを作成するヘルパー関数
    const createSelectChainMock = (finalResult: { data: unknown; error: unknown }) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(finalResult),
      }
      return {
        from: jest.fn().mockReturnValue(chain),
        auth: { getUser: jest.fn() },
      }
    }

    describe('正常系', () => {
      it('ユーザーの全購読情報を取得できること', async () => {
        // Arrange
        const mockRows = [
          {
            id: 'sub-1',
            endpoint: 'https://endpoint-1.com',
            p256dh: 'key-1',
            auth: 'auth-1',
          },
          {
            id: 'sub-2',
            endpoint: 'https://endpoint-2.com',
            p256dh: 'key-2',
            auth: 'auth-2',
          },
        ]
        const mockClient = createSelectChainMock({ data: mockRows, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getSubscriptions(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.length).toBe(2)
          expect(result.value[0].id).toBe('sub-1')
          expect(result.value[0].endpoint).toBe('https://endpoint-1.com')
          expect(result.value[0].p256dhKey).toBe('key-1')
          expect(result.value[0].authKey).toBe('auth-1')
          expect(result.value[1].id).toBe('sub-2')
        }
      })

      it('購読情報がない場合は空配列を返すこと', async () => {
        // Arrange
        const mockClient = createSelectChainMock({ data: [], error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getSubscriptions(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual([])
        }
      })

      it('dataがnullの場合も空配列を返すこと', async () => {
        // Arrange
        const mockClient = createSelectChainMock({ data: null, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getSubscriptions(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual([])
        }
      })
    })

    describe('異常系', () => {
      it('データベースエラー時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        const mockClient = createSelectChainMock({
          data: null,
          error: { code: 'ERROR', message: 'Query failed' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getSubscriptions(mockUserId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Query failed')
        }
      })

      it('予期しない例外時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue(new Error('Network error'))

        // Act
        const result = await getSubscriptions(mockUserId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Network error')
        }
      })
    })

    describe('境界値', () => {
      it('単一の購読情報を取得できること', async () => {
        // Arrange
        const mockRows = [
          {
            id: 'single-sub',
            endpoint: 'https://single-endpoint.com',
            p256dh: 'single-key',
            auth: 'single-auth',
          },
        ]
        const mockClient = createSelectChainMock({ data: mockRows, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getSubscriptions(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.length).toBe(1)
        }
      })
    })
  })

  describe('removeInvalidSubscription', () => {
    // チェーンモックを作成するヘルパー関数
    const createDeleteByIdChainMock = (finalResult: { error: unknown }) => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(finalResult),
      }
      return {
        from: jest.fn().mockReturnValue(chain),
        auth: { getUser: jest.fn() },
      }
    }

    describe('正常系', () => {
      it('無効な購読情報をIDで削除できること', async () => {
        // Arrange
        const subscriptionId = 'invalid-sub-123'
        const mockClient = createDeleteByIdChainMock({ error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await removeInvalidSubscription(subscriptionId, '410 Gone')

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBeUndefined()
        }
      })

      it('reasonなしでも削除できること', async () => {
        // Arrange
        const subscriptionId = 'invalid-sub-123'
        const mockClient = createDeleteByIdChainMock({ error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await removeInvalidSubscription(subscriptionId)

        // Assert
        expect(result.ok).toBe(true)
      })
    })

    describe('異常系', () => {
      it('データベースエラー時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        const subscriptionId = 'invalid-sub-123'
        const mockClient = createDeleteByIdChainMock({
          error: { code: 'ERROR', message: 'Delete by ID failed' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await removeInvalidSubscription(subscriptionId, '410 Gone')

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Delete by ID failed')
        }
      })

      it('予期しない例外時はDATABASE_ERRORを返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue(new Error('Timeout'))

        // Act
        const result = await removeInvalidSubscription('some-id')

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.type).toBe('DATABASE_ERROR')
          expect(result.error).toHaveProperty('message', 'Timeout')
        }
      })
    })
  })
})
