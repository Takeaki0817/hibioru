// 課金機能の型定義

import type { Result } from '@/lib/types/result'

// プランタイプ
export type PlanType = 'free' | 'premium_monthly' | 'premium_yearly'

// サブスクリプションステータス
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'

// サブスクリプション
export interface Subscription {
  id: string
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  planType: PlanType
  status: SubscriptionStatus
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// プラン制限
export interface PlanLimits {
  dailyEntryLimit: number | null // null = 無制限
  monthlyImageLimit: number | null // null = 無制限
}

// 制限ステータス
export interface LimitStatus {
  allowed: boolean
  current: number
  limit: number | null // null = 無制限
  remaining: number | null
  planType: PlanType
}

// プラン情報（UI表示用）
export interface PlanInfo {
  type: PlanType
  name: string
  price: number // 円
  interval: 'month' | 'year' | null
  limits: PlanLimits
  features: string[]
}

// 制限APIレスポンス
export interface LimitsResponse {
  planType: PlanType
  entryLimit: LimitStatus | null
  imageLimit: LimitStatus | null
  // キャンセル済みサブスクリプション情報
  canceledAt: string | null // ISO 8601形式
  currentPeriodEnd: string | null // ISO 8601形式
}

// 購入結果
export interface CheckoutResult {
  url: string
}

// エラー型
export type BillingErrorCode =
  | 'UNAUTHORIZED'
  | 'STRIPE_ERROR'
  | 'DB_ERROR'
  | 'SUBSCRIPTION_EXISTS'
  | 'INVALID_PLAN'
  | 'CUSTOMER_NOT_FOUND'

export interface BillingError {
  code: BillingErrorCode
  message: string
}

export type BillingResult<T> = Result<T, BillingError>
