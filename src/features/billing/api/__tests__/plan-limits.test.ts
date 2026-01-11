/**
 * プラン制限チェック機能のテスト
 * @jest-environment node
 */

import { checkEntryLimit, checkImageLimit, getPlanLimits } from '../plan-limits'
import { createClient } from '@/lib/supabase/server'
import { PLAN_LIMITS } from '../../constants'
import * as subscriptionService from '../subscription-service'

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
jest.mock('../subscription-service')

const mockCreateClient = jest.mocked(createClient)
const mockGetUserPlanType = jest.mocked(subscriptionService.getUserPlanType)
const mockGetSubscription = jest.mocked(subscriptionService.getSubscription)

describe('plan-limits', () => {
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkEntryLimit', () => {
    it('無料プランで制限内の場合はallowed=trueを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkEntryLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(5)
        expect(result.value.limit).toBe(PLAN_LIMITS.free.dailyEntryLimit)
        expect(result.value.remaining).toBe(10) // 15 - 5
        expect(result.value.planType).toBe('free')
      }
    })

    it('無料プランで上限到達時はallowed=falseを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 15, error: null }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkEntryLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(false)
        expect(result.value.current).toBe(15)
        expect(result.value.remaining).toBe(0)
      }
    })

    it('無料プランで上限超過時はallowed=falseを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 20, error: null }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkEntryLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(false)
        expect(result.value.current).toBe(20)
        expect(result.value.remaining).toBe(0)
      }
    })

    it('プレミアムプランは無制限でallowed=trueを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_monthly')

      const mockClient = {
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkEntryLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(0)
        expect(result.value.limit).toBeNull()
        expect(result.value.remaining).toBeNull()
        expect(result.value.planType).toBe('premium_monthly')
      }
    })

    it('プレミアム年額プランも無制限でallowed=trueを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_yearly')

      const mockClient = {
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkEntryLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.limit).toBeNull()
        expect(result.value.planType).toBe('premium_yearly')
      }
    })

    it('DBエラーの場合はDB_ERRORを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkEntryLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })

  describe('checkImageLimit', () => {
    it('無料プランで制限内の場合はallowed=trueを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkImageLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(2)
        expect(result.value.limit).toBe(PLAN_LIMITS.free.monthlyImageLimit)
        expect(result.value.remaining).toBe(3) // 5 - 2
        expect(result.value.planType).toBe('free')
      }
    })

    it('無料プランで上限到達時はallowed=falseを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkImageLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(false)
        expect(result.value.current).toBe(5)
        expect(result.value.remaining).toBe(0)
      }
    })

    it('プレミアムプランは無制限でallowed=trueを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('premium_monthly')

      const mockClient = {
        from: jest.fn(),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkImageLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(0)
        expect(result.value.limit).toBeNull()
        expect(result.value.remaining).toBeNull()
        expect(result.value.planType).toBe('premium_monthly')
      }
    })

    it('月次リセット後は0件からカウントされる', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      // 月初めの場合（画像付き投稿が0件）
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkImageLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(0)
        expect(result.value.remaining).toBe(5) // 全量残っている
      }
    })

    it('DBエラーの場合はDB_ERRORを返す', async () => {
      // Arrange
      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await checkImageLimit(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })

  describe('getPlanLimits', () => {
    it('全制限情報を取得できる', async () => {
      // Arrange
      mockGetSubscription.mockResolvedValue({
        ok: true,
        value: {
          id: 'sub-123',
          userId: mockUserId,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_stripe_123',
          stripePriceId: 'price_123',
          planType: 'premium_monthly',
          status: 'active',
          currentPeriodStart: new Date('2025-01-01'),
          currentPeriodEnd: new Date('2025-02-01'),
          canceledAt: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      })

      mockGetUserPlanType.mockResolvedValue('premium_monthly')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { hotsure_remaining: 2, bonus_hotsure: 0 },
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getPlanLimits(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.planType).toBe('premium_monthly')
        expect(result.value.entryLimit).not.toBeNull()
        expect(result.value.imageLimit).not.toBeNull()
        expect(result.value.canceledAt).toBeNull()
        expect(result.value.currentPeriodEnd).toBe('2025-02-01T00:00:00.000Z')
      }
    })

    it('ほつれ残高を含めて取得できる', async () => {
      // Arrange
      mockGetSubscription.mockResolvedValue({
        ok: true,
        value: {
          id: 'sub-123',
          userId: mockUserId,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          planType: 'free',
          status: 'active',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          canceledAt: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      })

      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 5, error: null }),
            not: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { hotsure_remaining: 1, bonus_hotsure: 1 },
              error: null,
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getPlanLimits(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.hotsureRemaining).toBe(1)
        expect(result.value.bonusHotsure).toBe(1)
      }
    })

    it('サブスクリプションがない場合はfreeプランとして返す', async () => {
      // Arrange
      mockGetSubscription.mockResolvedValue({
        ok: true,
        value: null,
      })

      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 0, error: null }),
            not: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { hotsure_remaining: 2, bonus_hotsure: 0 },
              error: null,
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getPlanLimits(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.planType).toBe('free')
      }
    })

    it('キャンセル済みサブスクリプションの情報を返す', async () => {
      // Arrange
      const canceledAt = new Date('2025-01-15')
      const periodEnd = new Date('2025-02-01')

      mockGetSubscription.mockResolvedValue({
        ok: true,
        value: {
          id: 'sub-123',
          userId: mockUserId,
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_stripe_123',
          stripePriceId: 'price_123',
          planType: 'premium_monthly',
          status: 'canceled',
          currentPeriodStart: new Date('2025-01-01'),
          currentPeriodEnd: periodEnd,
          canceledAt: canceledAt,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-15'),
        },
      })

      mockGetUserPlanType.mockResolvedValue('free') // キャンセル済みなのでfree

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 0, error: null }),
            not: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { hotsure_remaining: 2, bonus_hotsure: 0 },
              error: null,
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getPlanLimits(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.canceledAt).toBe(canceledAt.toISOString())
        expect(result.value.currentPeriodEnd).toBe(periodEnd.toISOString())
      }
    })

    it('streaksテーブルにデータがない場合はほつれ0で返す', async () => {
      // Arrange
      mockGetSubscription.mockResolvedValue({
        ok: true,
        value: null,
      })

      mockGetUserPlanType.mockResolvedValue('free')

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockResolvedValue({ count: 0, error: null }),
            not: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null, // streaksレコードがない
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      }
      mockCreateClient.mockResolvedValue(mockClient as ReturnType<typeof createClient>)

      // Act
      const result = await getPlanLimits(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.hotsureRemaining).toBe(0)
        expect(result.value.bonusHotsure).toBe(0)
      }
    })
  })
})
