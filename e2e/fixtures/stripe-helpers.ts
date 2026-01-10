import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/types/database.generated'
import Stripe from 'stripe'

const execAsync = promisify(exec)

/**
 * Stripe CLI統合テスト用ヘルパー
 * Webhookトリガー、DB検証、テストデータ管理
 */

// ローカルSupabaseのデフォルトservice role key
const LOCAL_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Supabase Admin Client（テスト用）
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_SUPABASE_SERVICE_ROLE_KEY
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

// Stripe Client（テスト用）
function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  })
}

// テスト用ユーザーID（UUID形式）
export const STRIPE_TEST_USERS = {
  free: '00000000-0000-4000-8000-000000000001',
  premium: '00000000-0000-4000-8000-000000000002',
  hotsure: '00000000-0000-4000-8000-000000000003',
}

/**
 * Stripe CLIでWebhookイベントをトリガー
 * @param eventType - Stripeイベントタイプ（例: 'checkout.session.completed'）
 * @param additionalArgs - 追加のCLI引数
 */
export async function triggerStripeWebhook(
  eventType: string,
  additionalArgs?: string
): Promise<{ stdout: string; stderr: string }> {
  const command = `stripe trigger ${eventType}${additionalArgs ? ` ${additionalArgs}` : ''}`
  try {
    const result = await execAsync(command)
    return result
  } catch (error) {
    console.error(`Stripe CLI error: ${error}`)
    throw error
  }
}

/**
 * Webhook処理完了を待機
 * DBの状態変化を監視して処理完了を検知
 * @param userId - 対象ユーザーID
 * @param expectedPlanType - 期待するプランタイプ
 * @param timeout - タイムアウト（ms）
 */
export async function waitForSubscriptionUpdate(
  userId: string,
  expectedPlanType: string,
  timeout: number = 10000
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .single()

    if (data?.plan_type === expectedPlanType) {
      return true
    }

    // 500ms待機してリトライ
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return false
}

/**
 * ユーザーのサブスクリプション情報を取得
 */
export async function getSubscription(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * ユーザーのbonus_hotsure残高を取得
 */
export async function getBonusHotsure(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('streaks')
    .select('bonus_hotsure')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data?.bonus_hotsure ?? 0
}

/**
 * bonus_hotsure加算を待機
 */
export async function waitForHotsureUpdate(
  userId: string,
  expectedMinimum: number,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const current = await getBonusHotsure(userId)
    if (current >= expectedMinimum) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return false
}

/**
 * テスト用サブスクリプションを作成（DB直接挿入）
 */
export async function createTestSubscription(
  userId: string,
  planType: 'free' | 'premium_monthly' | 'premium_yearly' = 'free',
  options?: {
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    status?: string
  }
) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_type: planType,
      status: options?.status || 'active',
      stripe_customer_id: options?.stripeCustomerId || null,
      stripe_subscription_id: options?.stripeSubscriptionId || null,
    },
    { onConflict: 'user_id' }
  )

  if (error) throw error
}

/**
 * テスト用streakレコードを作成（bonus_hotsure初期化）
 */
export async function createTestStreak(userId: string, bonusHotsure: number = 0) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      bonus_hotsure: bonusHotsure,
      last_entry_date: null,
    },
    { onConflict: 'user_id' }
  )

  if (error) throw error
}

/**
 * テスト用ユーザーを auth.users に作成
 * 外部キー制約を満たすために必要
 */
export async function createTestUser(userId: string, email: string) {
  const supabase = getSupabaseAdmin()

  // 既存ユーザー確認
  const { data: existingUser } = await supabase.auth.admin.getUserById(userId)
  if (existingUser?.user) {
    return // 既に存在する場合はスキップ
  }

  // テストユーザー作成
  const { error } = await supabase.auth.admin.createUser({
    id: userId,
    email,
    email_confirm: true,
    user_metadata: {
      full_name: 'E2E Test User',
      is_test_user: true,
    },
  })

  if (error && !error.message.includes('already been registered')) {
    throw error
  }
}

/**
 * テストデータクリーンアップ
 */
export async function cleanupTestData(userId: string) {
  const supabase = getSupabaseAdmin()

  // 購入履歴削除
  await supabase.from('hotsure_purchases').delete().eq('user_id', userId)

  // サブスクリプション削除
  await supabase.from('subscriptions').delete().eq('user_id', userId)

  // ストリーク削除
  await supabase.from('streaks').delete().eq('user_id', userId)

  // 注意: auth.usersからは削除しない（他のテストで再利用可能にする）
}

/**
 * Stripe Checkout Session を作成（テスト用）
 * 実際のStripe APIを使用してCheckout URLを取得
 */
export async function createTestCheckoutSession(
  userId: string,
  planType: 'premium_monthly' | 'premium_yearly'
): Promise<string | null> {
  const stripe = getStripeClient()

  const priceId =
    planType === 'premium_monthly'
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY

  if (!priceId) return null

  // テスト用顧客作成
  const customer = await stripe.customers.create({
    metadata: { supabase_user_id: userId, test: 'true' },
  })

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `http://localhost:3000/social?checkout=success`,
    cancel_url: `http://localhost:3000/social?checkout=canceled`,
    metadata: {
      user_id: userId,
      plan_type: planType,
    },
  })

  return session.url
}

/**
 * Webhook署名を生成（テスト用）
 * Stripe CLIのwhsecを使用して署名を生成
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  const crypto = require('crypto')
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

/**
 * Webhookエンドポイントに直接リクエスト送信（テスト用）
 */
export async function sendWebhookRequest(
  eventType: string,
  eventData: object,
  webhookSecret?: string
): Promise<Response> {
  const event = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: eventType,
    data: {
      object: eventData,
    },
    created: Math.floor(Date.now() / 1000),
  }

  const payload = JSON.stringify(event)
  const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || ''
  const signature = generateWebhookSignature(payload, secret)

  return fetch('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  })
}

/**
 * hotsure_purchasesテーブルの購入履歴を取得
 */
export async function getHotsurePurchases(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('hotsure_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * サブスクリプションが期待する状態か検証
 */
export async function verifySubscription(
  userId: string,
  expected: {
    planType: string
    status?: string
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
  }
): Promise<boolean> {
  const subscription = await getSubscription(userId)

  if (subscription.plan_type !== expected.planType) return false
  if (expected.status && subscription.status !== expected.status) return false
  if (expected.stripeCustomerId !== undefined) {
    if (expected.stripeCustomerId === null && subscription.stripe_customer_id !== null) return false
    if (expected.stripeCustomerId !== null && subscription.stripe_customer_id !== expected.stripeCustomerId)
      return false
  }

  return true
}
