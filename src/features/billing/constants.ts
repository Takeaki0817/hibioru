// 課金機能の定数

import type { PlanType, PlanLimits, PlanInfo } from './types'

// Stripe Price IDs（環境変数から取得）
export const STRIPE_PRICE_IDS = {
  PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '',
  PREMIUM_YEARLY: process.env.STRIPE_PRICE_PREMIUM_YEARLY ?? '',
  HOTSURE_PACK: process.env.STRIPE_PRICE_HOTSURE_PACK ?? '',
} as const

// プラン別制限
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    dailyEntryLimit: 15,
    monthlyImageLimit: 5,
  },
  premium_monthly: {
    dailyEntryLimit: null, // 無制限
    monthlyImageLimit: null, // 無制限
  },
  premium_yearly: {
    dailyEntryLimit: null,
    monthlyImageLimit: null,
  },
} as const

// プラン情報（UI表示用）
export const PLAN_INFO: Record<PlanType, PlanInfo> = {
  free: {
    type: 'free',
    name: '無料プラン',
    price: 0,
    interval: null,
    limits: PLAN_LIMITS.free,
    features: ['1日15件まで投稿', '月5枚まで画像添付'],
  },
  premium_monthly: {
    type: 'premium_monthly',
    name: 'プレミアム（月額）',
    price: 480,
    interval: 'month',
    limits: PLAN_LIMITS.premium_monthly,
    features: ['投稿数無制限', '画像添付無制限'],
  },
  premium_yearly: {
    type: 'premium_yearly',
    name: 'プレミアム（年額）',
    price: 4200,
    interval: 'year',
    limits: PLAN_LIMITS.premium_yearly,
    features: ['投稿数無制限', '画像添付無制限', '約27%お得'],
  },
} as const

// ほつれ単発価格
export const HOTSURE_PACK_PRICE = 120 // 円
export const HOTSURE_PACK_QUANTITY = 2 // 回分

// プレミアムプランかどうか判定
export function isPremiumPlan(planType: PlanType): boolean {
  return planType === 'premium_monthly' || planType === 'premium_yearly'
}
