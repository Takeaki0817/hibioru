import {
  PLAN_LIMITS,
  PLAN_INFO,
  HOTSURE_PACK_PRICE,
  HOTSURE_PACK_QUANTITY,
  isPremiumPlan,
} from '../constants'
import type { PlanType } from '../types'

describe('billing/constants', () => {
  describe('PLAN_LIMITS', () => {
    it('無料プランは日次15件、月次5枚の制限がある', () => {
      expect(PLAN_LIMITS.free.dailyEntryLimit).toBe(15)
      expect(PLAN_LIMITS.free.monthlyImageLimit).toBe(5)
    })

    it('プレミアム月額プランは無制限', () => {
      expect(PLAN_LIMITS.premium_monthly.dailyEntryLimit).toBeNull()
      expect(PLAN_LIMITS.premium_monthly.monthlyImageLimit).toBeNull()
    })

    it('プレミアム年額プランは無制限', () => {
      expect(PLAN_LIMITS.premium_yearly.dailyEntryLimit).toBeNull()
      expect(PLAN_LIMITS.premium_yearly.monthlyImageLimit).toBeNull()
    })
  })

  describe('PLAN_INFO', () => {
    it('無料プランの情報が正しい', () => {
      expect(PLAN_INFO.free).toEqual({
        type: 'free',
        name: '無料プラン',
        price: 0,
        interval: null,
        limits: PLAN_LIMITS.free,
        features: ['1日15件まで投稿', '月5枚まで画像添付'],
      })
    })

    it('プレミアム月額プランの情報が正しい', () => {
      expect(PLAN_INFO.premium_monthly.type).toBe('premium_monthly')
      expect(PLAN_INFO.premium_monthly.name).toBe('プレミアム（月額）')
      expect(PLAN_INFO.premium_monthly.price).toBe(480)
      expect(PLAN_INFO.premium_monthly.interval).toBe('month')
      expect(PLAN_INFO.premium_monthly.features).toContain('投稿数無制限')
      expect(PLAN_INFO.premium_monthly.features).toContain('画像添付無制限')
    })

    it('プレミアム年額プランの情報が正しい', () => {
      expect(PLAN_INFO.premium_yearly.type).toBe('premium_yearly')
      expect(PLAN_INFO.premium_yearly.name).toBe('プレミアム（年額）')
      expect(PLAN_INFO.premium_yearly.price).toBe(4200)
      expect(PLAN_INFO.premium_yearly.interval).toBe('year')
      expect(PLAN_INFO.premium_yearly.features).toContain('約27%お得')
    })

    it('年額プランは月額換算で約27%お得', () => {
      const monthlyPrice = PLAN_INFO.premium_monthly.price
      const yearlyPrice = PLAN_INFO.premium_yearly.price
      const yearlyMonthly = yearlyPrice / 12
      const discount = ((monthlyPrice - yearlyMonthly) / monthlyPrice) * 100

      // 約27%（25%〜30%の範囲）
      expect(discount).toBeGreaterThanOrEqual(25)
      expect(discount).toBeLessThanOrEqual(30)
    })
  })

  describe('HOTSURE_PACK', () => {
    it('ほつれパックは120円で2回分', () => {
      expect(HOTSURE_PACK_PRICE).toBe(120)
      expect(HOTSURE_PACK_QUANTITY).toBe(2)
    })
  })

  describe('isPremiumPlan', () => {
    it.each<[PlanType, boolean]>([
      ['free', false],
      ['premium_monthly', true],
      ['premium_yearly', true],
    ])('isPremiumPlan(%s) は %s を返す', (planType, expected) => {
      expect(isPremiumPlan(planType)).toBe(expected)
    })
  })
})
