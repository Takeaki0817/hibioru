import { test, expect } from '@playwright/test'
import {
  STRIPE_TEST_USERS,
  createTestSubscription,
  createTestStreak,
  cleanupTestData,
  createTestUser,
  getSubscription,
  getBonusHotsure,
  sendWebhookRequest,
  getHotsurePurchases,
  waitForSubscriptionUpdate,
  waitForHotsureUpdate,
} from './fixtures/stripe-helpers'

/**
 * Billing Webhook統合テスト
 *
 * Stripe Webhookイベントの処理を検証
 * 前提: Next.js開発サーバーが起動していること
 *
 * テスト対象イベント:
 * - checkout.session.completed（サブスクリプション作成）
 * - customer.subscription.updated（ステータス更新）
 * - customer.subscription.deleted（キャンセル）
 * - payment_intent.succeeded（ほつれ購入）
 * - 署名検証失敗
 */

// テスト前のセットアップ
test.beforeEach(async () => {
  // テストユーザーを作成（外部キー制約を満たすため）
  await createTestUser(STRIPE_TEST_USERS.free, 'billing-free@test.example.com')
  await createTestUser(STRIPE_TEST_USERS.premium, 'billing-premium@test.example.com')
  await createTestUser(STRIPE_TEST_USERS.hotsure, 'billing-hotsure@test.example.com')

  // テストユーザーのデータをクリーンアップ
  await cleanupTestData(STRIPE_TEST_USERS.free)
  await cleanupTestData(STRIPE_TEST_USERS.premium)
  await cleanupTestData(STRIPE_TEST_USERS.hotsure)
})

// テスト後のクリーンアップ
test.afterEach(async () => {
  await cleanupTestData(STRIPE_TEST_USERS.free)
  await cleanupTestData(STRIPE_TEST_USERS.premium)
  await cleanupTestData(STRIPE_TEST_USERS.hotsure)
})

// ============================================
// checkout.session.completed テスト
// ============================================
test.describe('checkout.session.completed Webhook', () => {
  test('サブスクリプション購入でsubscriptionsテーブルが更新される', async () => {
    const userId = STRIPE_TEST_USERS.free

    // 事前に無料プランのサブスクリプションを作成
    await createTestSubscription(userId, 'free')

    // checkout.session.completed イベントをシミュレート
    const checkoutSession = {
      id: 'cs_test_checkout_completed',
      object: 'checkout.session',
      mode: 'subscription',
      customer: 'cus_test_customer_123',
      subscription: 'sub_test_subscription_123',
      metadata: {
        user_id: userId,
        plan_type: 'premium_monthly',
      },
    }

    const response = await sendWebhookRequest('checkout.session.completed', checkoutSession)

    // Webhookが200 OKを返すことを確認
    expect(response.status).toBe(200)

    // DB更新を待機
    const updated = await waitForSubscriptionUpdate(userId, 'premium_monthly', 5000)
    expect(updated).toBe(true)

    // サブスクリプション情報を検証
    const subscription = await getSubscription(userId)
    expect(subscription.plan_type).toBe('premium_monthly')
    expect(subscription.stripe_customer_id).toBe('cus_test_customer_123')
  })

  test('年額プラン購入でplan_type=premium_yearlyになる', async () => {
    const userId = STRIPE_TEST_USERS.free

    await createTestSubscription(userId, 'free')

    const checkoutSession = {
      id: 'cs_test_checkout_yearly',
      object: 'checkout.session',
      mode: 'subscription',
      customer: 'cus_test_yearly_123',
      subscription: 'sub_test_yearly_123',
      metadata: {
        user_id: userId,
        plan_type: 'premium_yearly',
      },
    }

    const response = await sendWebhookRequest('checkout.session.completed', checkoutSession)
    expect(response.status).toBe(200)

    const updated = await waitForSubscriptionUpdate(userId, 'premium_yearly', 5000)
    expect(updated).toBe(true)
  })

  test('mode=paymentの場合は処理をスキップする（ほつれ購入用）', async () => {
    const userId = STRIPE_TEST_USERS.free

    await createTestSubscription(userId, 'free')

    const checkoutSession = {
      id: 'cs_test_payment_mode',
      object: 'checkout.session',
      mode: 'payment', // 単発決済
      customer: 'cus_test_payment',
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
      },
    }

    const response = await sendWebhookRequest('checkout.session.completed', checkoutSession)
    expect(response.status).toBe(200)

    // plan_typeは変更されないことを確認
    const subscription = await getSubscription(userId)
    expect(subscription.plan_type).toBe('free')
  })
})

// ============================================
// customer.subscription.updated テスト
// ============================================
test.describe('customer.subscription.updated Webhook', () => {
  test('サブスクリプションステータスが更新される', async () => {
    const userId = STRIPE_TEST_USERS.premium

    // 事前にプレミアムサブスクリプションを作成
    await createTestSubscription(userId, 'premium_monthly', {
      stripeSubscriptionId: 'sub_test_update',
      status: 'active',
    })

    const subscription = {
      id: 'sub_test_update',
      object: 'subscription',
      status: 'past_due', // 支払い遅延
      items: {
        data: [
          {
            price: { id: 'price_test' },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        ],
      },
      canceled_at: null,
    }

    const response = await sendWebhookRequest('customer.subscription.updated', subscription)
    expect(response.status).toBe(200)

    // ステータス更新を確認
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const updated = await getSubscription(userId)
    expect(updated.status).toBe('past_due')
  })

  test('キャンセル予約時にcanceled_atが設定される', async () => {
    const userId = STRIPE_TEST_USERS.premium

    await createTestSubscription(userId, 'premium_monthly', {
      stripeSubscriptionId: 'sub_test_cancel_scheduled',
      status: 'active',
    })

    const canceledAt = Math.floor(Date.now() / 1000)
    const subscription = {
      id: 'sub_test_cancel_scheduled',
      object: 'subscription',
      status: 'active',
      items: {
        data: [
          {
            price: { id: 'price_test' },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        ],
      },
      canceled_at: canceledAt,
    }

    const response = await sendWebhookRequest('customer.subscription.updated', subscription)
    expect(response.status).toBe(200)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    const updated = await getSubscription(userId)
    expect(updated.canceled_at).not.toBeNull()
  })
})

// ============================================
// customer.subscription.deleted テスト
// ============================================
test.describe('customer.subscription.deleted Webhook', () => {
  test('サブスクリプション削除でplan_type=freeに戻る', async () => {
    const userId = STRIPE_TEST_USERS.premium

    await createTestSubscription(userId, 'premium_monthly', {
      stripeSubscriptionId: 'sub_test_delete',
      status: 'active',
    })

    const subscription = {
      id: 'sub_test_delete',
      object: 'subscription',
      status: 'canceled',
    }

    const response = await sendWebhookRequest('customer.subscription.deleted', subscription)
    expect(response.status).toBe(200)

    // plan_type=freeに戻ることを確認
    const updated = await waitForSubscriptionUpdate(userId, 'free', 5000)
    expect(updated).toBe(true)

    const sub = await getSubscription(userId)
    expect(sub.status).toBe('canceled')
    expect(sub.stripe_subscription_id).toBeNull()
  })
})

// ============================================
// payment_intent.succeeded テスト（ほつれ購入）
// ============================================
test.describe('payment_intent.succeeded Webhook（ほつれ購入）', () => {
  test('ほつれ購入でbonus_hotsureが加算される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    // 事前にstreakレコード作成
    await createTestStreak(userId, 0)
    await createTestSubscription(userId, 'free')

    const paymentIntent = {
      id: 'pi_test_hotsure_purchase',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120, // 120円
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const response = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(response.status).toBe(200)

    // bonus_hotsure加算を確認
    const updated = await waitForHotsureUpdate(userId, 2, 5000)
    expect(updated).toBe(true)

    const bonus = await getBonusHotsure(userId)
    expect(bonus).toBe(2)
  })

  test('ほつれ購入でhotsure_purchasesに履歴が作成される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestStreak(userId, 0)
    await createTestSubscription(userId, 'free')

    const paymentIntent = {
      id: 'pi_test_hotsure_history',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const response = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(response.status).toBe(200)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    const purchases = await getHotsurePurchases(userId)
    expect(purchases.length).toBeGreaterThan(0)
    expect(purchases[0].status).toBe('completed')
    expect(purchases[0].quantity).toBe(2)
  })

  test('type=hotsure_purchase以外のpayment_intentは無視される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestStreak(userId, 0)

    const paymentIntent = {
      id: 'pi_test_other_payment',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 1000,
      metadata: {
        user_id: userId,
        type: 'other_purchase', // ほつれ購入ではない
      },
    }

    const response = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(response.status).toBe(200)

    // bonus_hotsureは変わらないことを確認
    const bonus = await getBonusHotsure(userId)
    expect(bonus).toBe(0)
  })
})

// ============================================
// 署名検証テスト
// ============================================
test.describe('Webhook署名検証', () => {
  test('無効な署名で400エラーを返す', async () => {
    const event = {
      id: 'evt_test_invalid_sig',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          mode: 'subscription',
        },
      },
    }

    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature',
      },
      body: JSON.stringify(event),
    })

    expect(response.status).toBe(400)
  })

  test('署名ヘッダーなしで400エラーを返す', async () => {
    const event = {
      id: 'evt_test_no_sig',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {},
      },
    }

    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // stripe-signature ヘッダーなし
      },
      body: JSON.stringify(event),
    })

    expect(response.status).toBe(400)
  })
})

// ============================================
// エッジケーステスト
// ============================================
test.describe('Webhookエッジケース', () => {
  test('user_idがないcheckout.session.completedは処理をスキップ', async () => {
    const checkoutSession = {
      id: 'cs_test_no_user',
      object: 'checkout.session',
      mode: 'subscription',
      customer: 'cus_test',
      subscription: 'sub_test',
      metadata: {
        // user_id なし
        plan_type: 'premium_monthly',
      },
    }

    const response = await sendWebhookRequest('checkout.session.completed', checkoutSession)
    // エラーにはならず、200を返す（ログに警告のみ）
    expect(response.status).toBe(200)
  })

  test('未対応のイベントタイプは無視される', async () => {
    const unknownEvent = {
      id: 'evt_unknown',
      object: 'event',
    }

    const response = await sendWebhookRequest('unknown.event.type', unknownEvent)
    expect(response.status).toBe(200)
  })
})
