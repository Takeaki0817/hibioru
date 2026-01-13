/**
 * サブスクリプションサービスのテスト
 * @jest-environment node
 */

import {
  getSubscription,
  getUserPlanType,
  createInitialSubscription,
} from '../subscription-service'
import { createClient } from '@/lib/supabase/server'

// モック設定
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

const mockCreateClient = jest.mocked(createClient)

describe('subscription-service', () => {
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSubscription', () => {
    it('サブスクリプション情報を取得できる', async () => {
      // Arrange
      const mockSubscriptionData = {
        id: 'sub-123',
        user_id: mockUserId,
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_stripe_123',
        stripe_price_id: 'price_123',
        plan_type: 'premium_monthly',
        status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        canceled_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSubscriptionData,
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).not.toBeNull()
        expect(result.value?.id).toBe('sub-123')
        expect(result.value?.userId).toBe(mockUserId)
        expect(result.value?.planType).toBe('premium_monthly')
        expect(result.value?.status).toBe('active')
        expect(result.value?.stripeCustomerId).toBe('cus_123')
      }
    })

    it('サブスクリプションが存在しない場合はnullを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }, // 行が見つからない
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBeNull()
      }
    })

    it('認証されていない場合はUNAUTHORIZEDエラーを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED')
      }
    })

    it('別のユーザーIDの場合はUNAUTHORIZEDエラーを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'different-user-id' } },
          }),
        },
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED')
      }
    })

    it('DBエラーの場合はDB_ERRORを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'OTHER_ERROR', message: 'DB error' },
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })

  describe('getUserPlanType', () => {
    it('アクティブなサブスクリプションがある場合はpremium_monthlyを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_type: 'premium_monthly', status: 'active' },
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getUserPlanType(mockUserId)

      // Assert
      expect(result).toBe('premium_monthly')
    })

    it('アクティブなサブスクリプションがある場合はpremium_yearlyを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_type: 'premium_yearly', status: 'active' },
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getUserPlanType(mockUserId)

      // Assert
      expect(result).toBe('premium_yearly')
    })

    it('サブスクリプションがない場合はfreeを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
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
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getUserPlanType(mockUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('サブスクリプションが非アクティブの場合はfreeを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_type: 'premium_monthly', status: 'canceled' },
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getUserPlanType(mockUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('認証されていない場合はfreeを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getUserPlanType(mockUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('エラーが発生した場合はfreeを返す', async () => {
      // Arrange
      mockCreateClient.mockRejectedValue(new Error('Connection error'))

      // Act
      const result = await getUserPlanType(mockUserId)

      // Assert
      expect(result).toBe('free')
    })
  })

  describe('createInitialSubscription', () => {
    it('初期サブスクリプションを作成できる', async () => {
      // Arrange
      const mockSubscriptionData = {
        id: 'sub-new-123',
        user_id: mockUserId,
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: null,
        stripe_price_id: null,
        plan_type: 'free',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        canceled_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSubscriptionData,
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await createInitialSubscription(mockUserId, 'cus_123')

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('sub-new-123')
        expect(result.value.planType).toBe('free')
        expect(result.value.status).toBe('active')
        expect(result.value.stripeCustomerId).toBe('cus_123')
      }
    })

    it('認証されていない場合はUNAUTHORIZEDエラーを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await createInitialSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('UNAUTHORIZED')
      }
    })

    it('DBエラーの場合はDB_ERRORを返す', async () => {
      // Arrange
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
          }),
        },
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert error' },
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await createInitialSubscription(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })
})
