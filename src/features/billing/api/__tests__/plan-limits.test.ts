import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkEntryLimit, checkImageLimit, getPlanLimits } from '../plan-limits'
import type { LimitStatus } from '../../types'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/date-utils', () => ({
  getJSTDayBounds: vi.fn(),
  getJSTMonthBounds: vi.fn(),
}))

vi.mock('../subscription-service', () => ({
  getSubscription: vi.fn(),
  getUserPlanType: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getJSTDayBounds, getJSTMonthBounds } from '@/lib/date-utils'
import { getUserPlanType, getSubscription } from '../subscription-service'

const mockSupabase = createClient as ReturnType<typeof vi.fn>
const mockGetJSTDayBounds = getJSTDayBounds as ReturnType<typeof vi.fn>
const mockGetJSTMonthBounds = getJSTMonthBounds as ReturnType<typeof vi.fn>
const mockGetUserPlanType = getUserPlanType as ReturnType<typeof vi.fn>
const mockGetSubscription = getSubscription as ReturnType<typeof vi.fn>

describe('Plan Limits', () => {
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('checkEntryLimit()', () => {
    it('should allow unlimited entries for premium_monthly plan', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_monthly')

      mockSupabase.mockResolvedValue({})

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(true)
      expect(result.value?.limit).toBeNull()
      expect(result.value?.remaining).toBeNull()
      expect(result.value?.planType).toBe('premium_monthly')
    })

    it('should allow unlimited entries for premium_yearly plan', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_yearly')

      mockSupabase.mockResolvedValue({})

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(true)
      expect(result.value?.limit).toBeNull()
      expect(result.value?.remaining).toBeNull()
      expect(result.value?.planType).toBe('premium_yearly')
    })

    it('should allow entry for free plan within daily limit', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTDayBounds.mockReturnValue({
        start: new Date('2026-01-15T00:00:00Z'),
        end: new Date('2026-01-16T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  gte: vi
                    .fn()
                    .mockReturnValue({
                      lt: vi.fn().mockResolvedValue({
                        data: Array(10).fill({}), // 10 entries
                        error: null,
                        count: 10,
                      }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(true)
      expect(result.value?.current).toBe(10)
      expect(result.value?.limit).toBe(15)
      expect(result.value?.remaining).toBe(5)
      expect(result.value?.planType).toBe('free')
    })

    it('should reject entry for free plan at daily limit', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTDayBounds.mockReturnValue({
        start: new Date('2026-01-15T00:00:00Z'),
        end: new Date('2026-01-16T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  gte: vi
                    .fn()
                    .mockReturnValue({
                      lt: vi.fn().mockResolvedValue({
                        data: Array(15).fill({}), // 15 entries (at limit)
                        error: null,
                        count: 15,
                      }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(false)
      expect(result.value?.current).toBe(15)
      expect(result.value?.limit).toBe(15)
      expect(result.value?.remaining).toBe(0)
    })

    it('should return remaining >= 0 even when current exceeds limit', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTDayBounds.mockReturnValue({
        start: new Date('2026-01-15T00:00:00Z'),
        end: new Date('2026-01-16T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  gte: vi
                    .fn()
                    .mockReturnValue({
                      lt: vi.fn().mockResolvedValue({
                        data: Array(20).fill({}), // 20 entries (over limit)
                        error: null,
                        count: 20,
                      }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.remaining).toBe(0)
    })

    it('should return DB_ERROR on query failure', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTDayBounds.mockReturnValue({
        start: new Date('2026-01-15T00:00:00Z'),
        end: new Date('2026-01-16T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  gte: vi
                    .fn()
                    .mockReturnValue({
                      lt: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'INVALID_STATE', message: 'Query failed' },
                      }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })

    it('should catch unexpected errors and return DB_ERROR', async () => {
      // Arrange
      mockGetUserPlanType.mockRejectedValue(new Error('Unexpected error'))

      // Act
      const result = await checkEntryLimit(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })
  })

  describe('checkImageLimit()', () => {
    it('should allow unlimited images for premium_monthly plan', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_monthly')

      mockSupabase.mockResolvedValue({})

      // Act
      const result = await checkImageLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(true)
      expect(result.value?.limit).toBeNull()
      expect(result.value?.remaining).toBeNull()
      expect(result.value?.planType).toBe('premium_monthly')
    })

    it('should allow unlimited images for premium_yearly plan', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_yearly')

      mockSupabase.mockResolvedValue({})

      // Act
      const result = await checkImageLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(true)
      expect(result.value?.limit).toBeNull()
      expect(result.value?.remaining).toBeNull()
      expect(result.value?.planType).toBe('premium_yearly')
    })

    it('should allow images for free plan within monthly limit', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTMonthBounds.mockReturnValue({
        start: new Date('2026-01-01T00:00:00Z'),
        end: new Date('2026-02-01T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  not: vi
                    .fn()
                    .mockReturnValue({
                      gte: vi
                        .fn()
                        .mockReturnValue({
                          lt: vi.fn().mockResolvedValue({
                            data: Array(2).fill({}), // 2 images with images
                            error: null,
                            count: 2,
                          }),
                        }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkImageLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(true)
      expect(result.value?.current).toBe(2)
      expect(result.value?.limit).toBe(5)
      expect(result.value?.remaining).toBe(3)
      expect(result.value?.planType).toBe('free')
    })

    it('should reject images for free plan at monthly limit', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTMonthBounds.mockReturnValue({
        start: new Date('2026-01-01T00:00:00Z'),
        end: new Date('2026-02-01T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  not: vi
                    .fn()
                    .mockReturnValue({
                      gte: vi
                        .fn()
                        .mockReturnValue({
                          lt: vi.fn().mockResolvedValue({
                            data: Array(5).fill({}), // 5 images (at limit)
                            error: null,
                            count: 5,
                          }),
                        }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkImageLimit(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.allowed).toBe(false)
      expect(result.value?.current).toBe(5)
      expect(result.value?.limit).toBe(5)
      expect(result.value?.remaining).toBe(0)
    })

    it('should return DB_ERROR on query failure', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      mockGetJSTMonthBounds.mockReturnValue({
        start: new Date('2026-01-01T00:00:00Z'),
        end: new Date('2026-02-01T00:00:00Z'),
      })

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi
            .fn()
            .mockReturnValue({
              eq: vi
                .fn()
                .mockReturnValue({
                  not: vi
                    .fn()
                    .mockReturnValue({
                      gte: vi
                        .fn()
                        .mockReturnValue({
                          lt: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'INVALID_STATE', message: 'Query failed' },
                          }),
                        }),
                    }),
                }),
            }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await checkImageLimit(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })

    it('should catch unexpected errors and return DB_ERROR', async () => {
      // Arrange
      mockGetUserPlanType.mockRejectedValue(new Error('Unexpected error'))

      // Act
      const result = await checkImageLimit(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })
  })

  describe('getPlanLimits()', () => {
    it('should return combined plan limits for premium plan', async () => {
      // Arrange
      const mockSubscription = {
        ok: true,
        value: {
          id: 'sub-1',
          userId: testUserId,
          planType: 'premium_monthly' as const,
          status: 'active' as const,
          canceledAt: null,
          currentPeriodEnd: new Date('2026-02-01'),
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          stripePriceId: 'price_123',
          currentPeriodStart: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      }

      const mockEntryResult = {
        ok: true,
        value: {
          allowed: true,
          current: 0,
          limit: null,
          remaining: null,
          planType: 'premium_monthly' as const,
        },
      }

      const mockImageResult = {
        ok: true,
        value: {
          allowed: true,
          current: 0,
          limit: null,
          remaining: null,
          planType: 'premium_monthly' as const,
        },
      }

      mockGetSubscription.mockResolvedValue(mockSubscription)
      vi.mocked(getUserPlanType).mockResolvedValue('premium_monthly')

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { hotsure_remaining: 0, bonus_hotsure: 1 },
            error: null,
          }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Mock checkEntryLimit and checkImageLimit
      vi.doMock('../plan-limits', async () => {
        const actual = await vi.importActual<typeof import('../plan-limits')>('../plan-limits')
        return {
          ...actual,
          checkEntryLimit: vi.fn().mockResolvedValue(mockEntryResult),
          checkImageLimit: vi.fn().mockResolvedValue(mockImageResult),
        }
      })

      // Act
      const result = await getPlanLimits(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.planType).toBe('premium_monthly')
      expect(result.value?.entryLimit?.allowed).toBe(true)
      expect(result.value?.imageLimit?.allowed).toBe(true)
      expect(result.value?.hotsureRemaining).toBe(0)
      expect(result.value?.bonusHotsure).toBe(1)
    })

    it('should return combined plan limits for free plan', async () => {
      // Arrange
      const mockSubscription = {
        ok: true,
        value: {
          id: 'sub-1',
          userId: testUserId,
          planType: 'free' as const,
          status: 'active' as const,
          canceledAt: null,
          currentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodStart: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      }

      const mockEntryResult = {
        ok: true,
        value: {
          allowed: true,
          current: 5,
          limit: 15,
          remaining: 10,
          planType: 'free' as const,
        },
      }

      const mockImageResult = {
        ok: true,
        value: {
          allowed: true,
          current: 1,
          limit: 5,
          remaining: 4,
          planType: 'free' as const,
        },
      }

      mockGetSubscription.mockResolvedValue(mockSubscription)

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { hotsure_remaining: 2, bonus_hotsure: 0 },
            error: null,
          }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Mock checkEntryLimit and checkImageLimit
      vi.doMock('../plan-limits', async () => {
        const actual = await vi.importActual<typeof import('../plan-limits')>('../plan-limits')
        return {
          ...actual,
          checkEntryLimit: vi.fn().mockResolvedValue(mockEntryResult),
          checkImageLimit: vi.fn().mockResolvedValue(mockImageResult),
        }
      })

      // Act
      const result = await getPlanLimits(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.planType).toBe('free')
      expect(result.value?.entryLimit?.current).toBe(5)
      expect(result.value?.imageLimit?.current).toBe(1)
      expect(result.value?.hotsureRemaining).toBe(2)
      expect(result.value?.bonusHotsure).toBe(0)
    })

    it('should handle missing hotsure data gracefully', async () => {
      // Arrange
      const mockSubscription = {
        ok: true,
        value: {
          id: 'sub-1',
          userId: testUserId,
          planType: 'free' as const,
          status: 'active' as const,
          canceledAt: null,
          currentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodStart: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      }

      mockGetSubscription.mockResolvedValue(mockSubscription)

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null, // No hotsure data
            error: null,
          }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await getPlanLimits(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.hotsureRemaining).toBe(0)
      expect(result.value?.bonusHotsure).toBe(0)
    })

    it('should return defaults for subscription error', async () => {
      // Arrange
      const mockSubscription = {
        ok: false,
        error: { code: 'DB_ERROR' as const, message: 'DB error' },
      }

      mockGetSubscription.mockResolvedValue(mockSubscription)

      const mockSelect = vi
        .fn()
        .mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { hotsure_remaining: 0, bonus_hotsure: 0 },
            error: null,
          }),
        })

      mockSupabase.mockResolvedValue({
        from: mockSelect,
      })

      // Act
      const result = await getPlanLimits(testUserId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value?.planType).toBe('free')
    })

    it('should catch unexpected errors and return DB_ERROR', async () => {
      // Arrange
      mockGetSubscription.mockRejectedValue(new Error('Unexpected error'))

      // Act
      const result = await getPlanLimits(testUserId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('DB_ERROR')
    })
  })
})
