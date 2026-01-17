import {
  getSubscription,
  getUserPlanType,
  createInitialSubscription,
} from '../subscription-service'
import type { Subscription } from '../../types'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockSupabase = createClient as jest.MockedFunction<typeof createClient>

describe('Subscription Service', () => {
  const testUserId = 'test-user-123'
  const testUser = { id: testUserId }

  const mockSubscriptionData = {
    id: 'sub-1',
    user_id: testUserId,
    stripe_customer_id: 'cus_test_123',
    stripe_subscription_id: 'sub_test_123',
    stripe_price_id: 'price_test_monthly',
    plan_type: 'premium_monthly',
    status: 'active',
    current_period_start: '2026-01-01T00:00:00Z',
    current_period_end: '2026-02-01T00:00:00Z',
    canceled_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSubscription()', () => {
    it('should return subscription when it exists', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }) }) })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toEqual(
        expect.objectContaining({
          userId: testUserId,
          planType: 'premium_monthly',
          status: 'active',
        })
      )
    })

    it('should return null when subscription does not exist', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toBeNull()
    })

    it('should return UNAUTHORIZED error when user does not match', async () => {
      // Arrange
      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'different-user-id' } },
            error: null,
          }),
        },
      } as any)

      // Act
      const result = await getSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should return UNAUTHORIZED error when no user is authenticated', async () => {
      // Arrange
      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any)

      // Act
      const result = await getSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should return DB_ERROR on query failure', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'INVALID_STATE', message: 'DB Error' },
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })

    it('should convert date strings to Date objects', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: mockSubscriptionData, error: null }) }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok && result.value) {
        expect(result.value.currentPeriodStart).toBeInstanceOf(Date)
        expect(result.value.currentPeriodEnd).toBeInstanceOf(Date)
        expect(result.value.createdAt).toBeInstanceOf(Date)
        expect(result.value.updatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('getUserPlanType()', () => {
    it('should return premium_monthly for active premium_monthly subscription', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'premium_monthly',
                status: 'active',
                current_period_end: '2026-02-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('premium_monthly')
    })

    it('should return premium_yearly for active premium_yearly subscription', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'premium_yearly',
                status: 'active',
                current_period_end: '2027-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('premium_yearly')
    })

    it('should return free for canceled subscription with past period end', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'premium_monthly',
                status: 'canceled',
                current_period_end: '2025-12-31T00:00:00Z', // Past date
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('should return premium_monthly for canceled subscription with future period end', async () => {
      // Arrange
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'premium_monthly',
                status: 'canceled',
                current_period_end: futureDate.toISOString(),
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('premium_monthly')
    })

    it('should return free for free plan type', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'free',
                status: 'active',
                current_period_end: null,
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('should return free for no record found', async () => {
      // Arrange
      const mockSelect = jest
        .fn()
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: mockSelect,
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('should return free for different user id', async () => {
      // Arrange
      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'different-user-id' } },
            error: null,
          }),
        },
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('should return free for no authenticated user', async () => {
      // Arrange
      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any)

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('free')
    })

    it('should return free on error', async () => {
      // Arrange
      mockSupabase.mockRejectedValue(new Error('Unexpected error'))

      // Act
      const result = await getUserPlanType(testUserId)

      // Assert
      expect(result).toBe('free')
    })
  })

  describe('createInitialSubscription()', () => {
    it('should create initial free subscription without customer id', async () => {
      // Arrange
      const mockUpsert = jest
        .fn()
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'sub-1',
                user_id: testUserId,
                stripe_customer_id: null,
                stripe_subscription_id: null,
                stripe_price_id: null,
                plan_type: 'free',
                status: 'active',
                current_period_start: null,
                current_period_end: null,
                canceled_at: null,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
      } as any)

      // Act
      const result = await createInitialSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.planType).toBe('free')
      expect(result.value?.status).toBe('active')
      expect(result.value?.stripeCustomerId).toBeNull()
    })

    it('should create initial subscription with customer id', async () => {
      // Arrange
      const customerId = 'cus_test_456'

      const mockUpsert = jest
        .fn()
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'sub-1',
                user_id: testUserId,
                stripe_customer_id: customerId,
                stripe_subscription_id: null,
                stripe_price_id: null,
                plan_type: 'free',
                status: 'active',
                current_period_start: null,
                current_period_end: null,
                canceled_at: null,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
      } as any)

      // Act
      const result = await createInitialSubscription(testUserId, customerId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.stripeCustomerId).toBe(customerId)
    })

    it('should return UNAUTHORIZED error when user does not match', async () => {
      // Arrange
      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'different-user-id' } },
            error: null,
          }),
        },
      } as any)

      // Act
      const result = await createInitialSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should return UNAUTHORIZED error when no user is authenticated', async () => {
      // Arrange
      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any)

      // Act
      const result = await createInitialSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should return DB_ERROR on upsert failure', async () => {
      // Arrange
      const mockUpsert = jest
        .fn()
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'INVALID_STATE', message: 'Upsert failed' },
            }),
          }),
        })

      mockSupabase.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: testUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
      } as any)

      // Act
      const result = await createInitialSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })

    it('should catch unexpected errors and return DB_ERROR', async () => {
      // Arrange
      mockSupabase.mockRejectedValue(new Error('Unexpected error'))

      // Act
      const result = await createInitialSubscription(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })
  })
})
