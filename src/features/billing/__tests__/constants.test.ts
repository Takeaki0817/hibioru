import {
  STRIPE_PRICE_IDS,
  PLAN_LIMITS,
  PLAN_INFO,
  HOTSURE_PACK_PRICE,
  HOTSURE_PACK_QUANTITY,
  HOTSURE_MAX_TOTAL,
  isPremiumPlan,
  getPlanTypeFromPriceId,
  isValidHotsurePurchase,
} from '../constants'

describe('Billing Constants', () => {
  describe('PLAN_LIMITS', () => {
    it('should have correct limits for free plan', () => {
      // Arrange & Act
      const limits = PLAN_LIMITS.free

      // Assert
      expect(limits.dailyEntryLimit).toBe(15)
      expect(limits.monthlyImageLimit).toBe(5)
    })

    it('should have unlimited limits for premium_monthly plan', () => {
      // Arrange & Act
      const limits = PLAN_LIMITS.premium_monthly

      // Assert
      expect(limits.dailyEntryLimit).toBeNull()
      expect(limits.monthlyImageLimit).toBeNull()
    })

    it('should have unlimited limits for premium_yearly plan', () => {
      // Arrange & Act
      const limits = PLAN_LIMITS.premium_yearly

      // Assert
      expect(limits.dailyEntryLimit).toBeNull()
      expect(limits.monthlyImageLimit).toBeNull()
    })
  })

  describe('PLAN_INFO', () => {
    it('should have correct info for free plan', () => {
      // Arrange & Act
      const info = PLAN_INFO.free

      // Assert
      expect(info.type).toBe('free')
      expect(info.name).toBe('無料プラン')
      expect(info.price).toBe(0)
      expect(info.interval).toBeNull()
      expect(info.features).toContain('1日15件まで投稿')
      expect(info.features).toContain('月5枚まで画像添付')
    })

    it('should have correct info for premium_monthly plan', () => {
      // Arrange & Act
      const info = PLAN_INFO.premium_monthly

      // Assert
      expect(info.type).toBe('premium_monthly')
      expect(info.name).toBe('プレミアム（月額）')
      expect(info.price).toBe(480)
      expect(info.interval).toBe('month')
      expect(info.features).toContain('投稿数無制限')
      expect(info.features).toContain('画像添付無制限')
    })

    it('should have correct info for premium_yearly plan', () => {
      // Arrange & Act
      const info = PLAN_INFO.premium_yearly

      // Assert
      expect(info.type).toBe('premium_yearly')
      expect(info.name).toBe('プレミアム（年額）')
      expect(info.price).toBe(4200)
      expect(info.interval).toBe('year')
      expect(info.features).toContain('投稿数無制限')
      expect(info.features).toContain('画像添付無制限')
    })

    it('should reference PLAN_LIMITS for limits', () => {
      // Arrange & Act & Assert
      expect(PLAN_INFO.free.limits).toEqual(PLAN_LIMITS.free)
      expect(PLAN_INFO.premium_monthly.limits).toEqual(PLAN_LIMITS.premium_monthly)
      expect(PLAN_INFO.premium_yearly.limits).toEqual(PLAN_LIMITS.premium_yearly)
    })
  })

  describe('HOTSURE constants', () => {
    it('should have correct hotsure pack price', () => {
      // Arrange & Act & Assert
      expect(HOTSURE_PACK_PRICE).toBe(120)
    })

    it('should have correct hotsure pack quantity', () => {
      // Arrange & Act & Assert
      expect(HOTSURE_PACK_QUANTITY).toBe(1)
    })

    it('should have correct hotsure max total', () => {
      // Arrange & Act & Assert
      expect(HOTSURE_MAX_TOTAL).toBe(2)
    })
  })

  describe('isPremiumPlan()', () => {
    it('should return true for premium_monthly', () => {
      // Arrange & Act
      const result = isPremiumPlan('premium_monthly')

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for premium_yearly', () => {
      // Arrange & Act
      const result = isPremiumPlan('premium_yearly')

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for free', () => {
      // Arrange & Act
      const result = isPremiumPlan('free')

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('getPlanTypeFromPriceId()', () => {
    it('should return null for invalid price id', () => {
      // Arrange
      const invalidId = 'price_invalid_789'

      // Act
      const result = getPlanTypeFromPriceId(invalidId)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      // Arrange
      const emptyId = ''

      // Act
      const result = getPlanTypeFromPriceId(emptyId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('isValidHotsurePurchase()', () => {
    it('should return true for valid single pack purchase (120円)', () => {
      // Arrange
      const amount = 120
      const quantity = 1

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for valid multi-pack purchase (240円)', () => {
      // Arrange
      const amount = 240
      const quantity = 2

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for valid multi-pack purchase (360円)', () => {
      // Arrange
      const amount = 360
      const quantity = 3

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for invalid amount (100円 with quantity 1)', () => {
      // Arrange
      const amount = 100
      const quantity = 1

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert
      expect(result).toBe(false)
    })

    it('should return true for zero amount with zero quantity', () => {
      // Arrange - edge case: 0 * 0 = 0
      const amount = 0
      const quantity = 0

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert - mathematically correct (0 = 120 * 0 = 0)
      expect(result).toBe(true)
    })

    it('should return false for mismatched amount', () => {
      // Arrange
      const amount = 200
      const quantity = 2

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for negative amount', () => {
      // Arrange
      const amount = -120
      const quantity = 1

      // Act
      const result = isValidHotsurePurchase(amount, quantity)

      // Assert
      expect(result).toBe(false)
    })
  })
})
