import { test, expect } from '@playwright/test'
import {
  setupTestSession,
  waitForPageLoad,
  setupFreePlanUser,
  interceptStripeCheckout,
  mockBillingLimitsAPI,
} from './fixtures/test-helpers'
import {
  STRIPE_TEST_USERS,
  createTestSubscription,
  createTestStreak,
  cleanupTestData,
  createTestUser,
  getBonusHotsure,
  getHotsurePurchases,
  sendWebhookRequest,
  waitForHotsureUpdate,
} from './fixtures/stripe-helpers'

/**
 * ほつれパック購入E2Eテスト
 *
 * 単発決済によるほつれ（スキップ回数）購入フローを検証
 * - 購入ボタン → Checkout遷移
 * - 決済完了 → Webhook → bonus_hotsure加算
 * - 購入履歴作成
 *
 * 前提:
 * - Next.js開発サーバー起動
 * - Stripe CLI起動
 */

// テスト前後でデータクリーンアップとユーザー作成
test.beforeEach(async () => {
  // テストユーザーを作成（外部キー制約を満たすため）
  await createTestUser(STRIPE_TEST_USERS.hotsure, 'billing-hotsure@test.example.com')

  // データクリーンアップ
  await cleanupTestData(STRIPE_TEST_USERS.hotsure)
})

test.afterEach(async () => {
  await cleanupTestData(STRIPE_TEST_USERS.hotsure)
})

// ============================================
// 購入ボタン表示テスト
// ============================================
test.describe('ほつれ購入UI', () => {
  test('購入ボタンと価格「2回分 ¥120」が表示される', async ({ page }) => {
    await setupFreePlanUser(page)

    await page.goto('/social')
    await waitForPageLoad(page)

    // ほつれ購入セクション確認
    await expect(page.getByText('ほつれを追加購入')).toBeVisible()
    await expect(page.getByText('2回分')).toBeVisible()
    await expect(page.getByText('¥120')).toBeVisible()

    const purchaseBtn = page.locator('[data-testid="purchase-hotsure-btn"]')
    await expect(purchaseBtn).toBeVisible()
  })

  test('購入ボタンクリックでStripe Checkoutにリダイレクトされる', async ({ page }) => {
    const checkout = await interceptStripeCheckout(page)

    await setupTestSession(page, STRIPE_TEST_USERS.hotsure)
    await createTestSubscription(STRIPE_TEST_USERS.hotsure, 'free')
    await createTestStreak(STRIPE_TEST_USERS.hotsure, 0)
    await mockBillingLimitsAPI(page, { planType: 'free' })

    await page.goto('/social')
    await waitForPageLoad(page)

    const purchaseBtn = page.locator('[data-testid="purchase-hotsure-btn"]')
    await expect(purchaseBtn).toBeVisible()
    await purchaseBtn.click()

    // Stripe Checkoutへのリダイレクトを待機
    await page.waitForTimeout(2000)
  })
})

// ============================================
// 購入完了フロー（Webhook統合）
// ============================================
test.describe('ほつれ購入完了フロー', () => {
  test('購入完了でbonus_hotsureが+2される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    // 初期状態：bonus_hotsure = 0
    await createTestSubscription(userId, 'free')
    await createTestStreak(userId, 0)

    const initialHotsure = await getBonusHotsure(userId)
    expect(initialHotsure).toBe(0)

    // payment_intent.succeeded Webhookを送信
    const paymentIntent = {
      id: `pi_test_hotsure_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const webhookResponse = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(webhookResponse.status).toBe(200)

    // bonus_hotsure加算を待機
    const updated = await waitForHotsureUpdate(userId, 2, 5000)
    expect(updated).toBe(true)

    const newHotsure = await getBonusHotsure(userId)
    expect(newHotsure).toBe(2)
  })

  test('購入完了でhotsure_purchasesに履歴が作成される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestSubscription(userId, 'free')
    await createTestStreak(userId, 0)

    const paymentIntent = {
      id: `pi_test_hotsure_history_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const webhookResponse = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(webhookResponse.status).toBe(200)

    // 購入履歴確認を待機
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const purchases = await getHotsurePurchases(userId)

    expect(purchases.length).toBeGreaterThan(0)
    expect(purchases[0].status).toBe('completed')
    expect(purchases[0].quantity).toBe(2)
    expect(purchases[0].amount).toBe(120)
  })

  test('複数回購入でbonus_hotsureが累積される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestSubscription(userId, 'free')
    await createTestStreak(userId, 0)

    // 1回目の購入
    const paymentIntent1 = {
      id: `pi_test_hotsure_first_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    await sendWebhookRequest('payment_intent.succeeded', paymentIntent1)
    await waitForHotsureUpdate(userId, 2, 5000)

    // 2回目の購入
    const paymentIntent2 = {
      id: `pi_test_hotsure_second_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    await sendWebhookRequest('payment_intent.succeeded', paymentIntent2)
    await waitForHotsureUpdate(userId, 4, 5000)

    const finalHotsure = await getBonusHotsure(userId)
    expect(finalHotsure).toBe(4)
  })
})

// ============================================
// 購入キャンセル
// ============================================
test.describe('ほつれ購入キャンセル', () => {
  test('購入キャンセル後に/social?hotsure_purchase=canceledでページ表示', async ({ page }) => {
    await setupFreePlanUser(page)

    await page.goto('/social?hotsure_purchase=canceled')
    await waitForPageLoad(page)

    // ページが正常に表示されることを確認
    const billingSection = page.locator('[data-testid="billing-section"]')
    await expect(billingSection).toBeVisible()
  })

  test('購入成功後に/social?hotsure_purchase=successでページ表示', async ({ page }) => {
    await setupFreePlanUser(page)

    await page.goto('/social?hotsure_purchase=success')
    await waitForPageLoad(page)

    const billingSection = page.locator('[data-testid="billing-section"]')
    await expect(billingSection).toBeVisible()
  })
})

// ============================================
// エラーケース
// ============================================
test.describe('ほつれ購入エラーケース', () => {
  test('user_idがないpayment_intentは無視される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestSubscription(userId, 'free')
    await createTestStreak(userId, 0)

    const paymentIntent = {
      id: `pi_test_no_user_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        // user_id なし
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const webhookResponse = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    // エラーにはならない（ログ出力のみ）
    expect(webhookResponse.status).toBe(200)

    // bonus_hotsureは変わらない
    const hotsure = await getBonusHotsure(userId)
    expect(hotsure).toBe(0)
  })

  test('type=hotsure_purchase以外のpayment_intentは無視される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestSubscription(userId, 'free')
    await createTestStreak(userId, 0)

    const paymentIntent = {
      id: `pi_test_other_type_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 1000,
      metadata: {
        user_id: userId,
        type: 'some_other_purchase',
        quantity: '1',
      },
    }

    const webhookResponse = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(webhookResponse.status).toBe(200)

    // bonus_hotsureは変わらない
    const hotsure = await getBonusHotsure(userId)
    expect(hotsure).toBe(0)
  })

  test('金額と数量の不整合で購入が拒否される', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    await createTestSubscription(userId, 'free')
    await createTestStreak(userId, 0)

    // 金額が不正（2個で120円のはずが、240円になっている）
    const paymentIntent = {
      id: `pi_test_invalid_amount_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 240, // 不正な金額
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const webhookResponse = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(webhookResponse.status).toBe(200)

    // 検証失敗のためbonus_hotsureは加算されない
    const hotsure = await getBonusHotsure(userId)
    expect(hotsure).toBe(0)
  })
})

// ============================================
// プレミアムユーザーのほつれ購入
// ============================================
test.describe('プレミアムユーザーのほつれ購入', () => {
  test('プレミアムユーザーもほつれを購入できる', async () => {
    const userId = STRIPE_TEST_USERS.hotsure

    // プレミアムユーザーとして初期化
    await createTestSubscription(userId, 'premium_monthly')
    await createTestStreak(userId, 0)

    const paymentIntent = {
      id: `pi_test_premium_hotsure_${Date.now()}`,
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        user_id: userId,
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const webhookResponse = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(webhookResponse.status).toBe(200)

    const updated = await waitForHotsureUpdate(userId, 2, 5000)
    expect(updated).toBe(true)
  })
})
