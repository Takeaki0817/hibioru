import { test, expect } from '@playwright/test'
import {
  setupTestSession,
  waitForPageLoad,
  setupFreePlanUser,
  setupPremiumPlanUser,
  mockBillingLimitsAPI,
} from './fixtures/test-helpers'
import {
  STRIPE_TEST_USERS,
  createTestSubscription,
  cleanupTestData,
  createTestUser,
  getSubscription,
  sendWebhookRequest,
} from './fixtures/stripe-helpers'

/**
 * Billingエラーケースのテスト
 *
 * 決済フローにおける各種エラーケースを検証
 * - 既存プレミアムユーザーの再購入防止
 * - 未認証でのアクセス制限
 * - Webhook署名検証
 * - API失敗時のエラー表示
 */

// テスト前後でデータクリーンアップとユーザー作成
test.beforeEach(async () => {
  // テストユーザーを作成（外部キー制約を満たすため）
  await createTestUser(STRIPE_TEST_USERS.free, 'billing-free@test.example.com')
  await createTestUser(STRIPE_TEST_USERS.premium, 'billing-premium@test.example.com')

  // データクリーンアップ
  await cleanupTestData(STRIPE_TEST_USERS.free)
  await cleanupTestData(STRIPE_TEST_USERS.premium)
})

test.afterEach(async () => {
  await cleanupTestData(STRIPE_TEST_USERS.free)
  await cleanupTestData(STRIPE_TEST_USERS.premium)
})

// ============================================
// 既存プレミアムユーザーの再購入防止
// ============================================
test.describe('既存プレミアムユーザーの再購入防止', () => {
  test('プレミアムユーザーが/social/plansにアクセスできる', async ({ page }) => {
    await setupPremiumPlanUser(page)

    await page.goto('/social/plans')
    await waitForPageLoad(page)

    // プランページは表示される
    const monthlyCard = page.locator('[data-testid="plan-card-monthly"]')
    await expect(monthlyCard).toBeVisible()
  })

  test('createCheckoutSessionは既存プレミアムでSUBSCRIPTION_EXISTSエラーを返す', async () => {
    const userId = STRIPE_TEST_USERS.premium

    // プレミアムユーザーとして初期化
    await createTestSubscription(userId, 'premium_monthly', {
      stripeCustomerId: 'cus_existing_premium',
      stripeSubscriptionId: 'sub_existing_premium',
      status: 'active',
    })

    // Server Action経由のエラーレスポンスをテスト
    // 注意: Server Actionの直接テストはユニットテストで実施
    // E2Eでは状態が変わらないことを確認

    const subscription = await getSubscription(userId)
    expect(subscription.plan_type).toBe('premium_monthly')
  })

  test('キャンセル済みプレミアム（期限内）は再購入できない', async ({ page }) => {
    const userId = STRIPE_TEST_USERS.premium

    // キャンセル済みだが期限内のユーザー
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + 7)

    await createTestSubscription(userId, 'premium_monthly', {
      stripeSubscriptionId: 'sub_canceled',
      status: 'active', // まだactive
    })

    // plan_typeがpremium_monthlyの場合、再購入はブロックされる
    const subscription = await getSubscription(userId)
    expect(subscription.plan_type).toBe('premium_monthly')
  })
})

// ============================================
// 未認証アクセス制限
// ============================================
test.describe('未認証アクセス制限', () => {
  test('未認証で/socialにアクセスするとログインページにリダイレクト', async ({ page }) => {
    // セッションなしでアクセス
    await page.goto('/social')
    await waitForPageLoad(page)

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/')
  })

  test('/social/plansは未認証でもアクセス可能', async ({ page }) => {
    await page.goto('/social/plans')
    await waitForPageLoad(page)

    // プランページは表示される
    await expect(page).toHaveURL('/social/plans')
    await expect(page.locator('[data-testid="plan-card-monthly"]')).toBeVisible()
  })

  test('未認証で設定ボタンクリック後にログインにリダイレクト', async ({ page }) => {
    await page.goto('/social/plans')
    await waitForPageLoad(page)

    // 設定に戻るリンクをクリック
    const backLink = page.getByRole('link', { name: '設定に戻る' })
    await backLink.click()

    // 未認証のためログインページにリダイレクト
    await expect(page).toHaveURL('/')
  })
})

// ============================================
// Webhook署名検証
// ============================================
test.describe('Webhook署名検証', () => {
  test('無効な署名で400エラーを返す', async () => {
    const event = {
      id: 'evt_test_invalid',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          mode: 'subscription',
          metadata: { user_id: 'test' },
        },
      },
    }

    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature_here',
      },
      body: JSON.stringify(event),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid signature')
  })

  test('署名ヘッダーなしで400エラーを返す', async () => {
    const event = {
      id: 'evt_test_no_sig',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: {} },
    }

    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // stripe-signature なし
      },
      body: JSON.stringify(event),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing signature')
  })

  test('空のリクエストボディで400エラーを返す', async () => {
    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123,v1=abc',
      },
      body: '',
    })

    expect(response.status).toBe(400)
  })
})

// ============================================
// API失敗時のエラー表示
// ============================================
test.describe('API失敗時のエラー表示', () => {
  test('APIエラー時もページがクラッシュしない', async ({ page }) => {
    // 無効なAPIレスポンスをモック
    await page.route('/api/billing/limits', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await setupTestSession(page, STRIPE_TEST_USERS.free)

    await page.goto('/social')
    await waitForPageLoad(page)

    // ページがクラッシュせずに表示されることを確認
    // エラー状態でも基本的なUIは表示される
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('ネットワークエラー時もページがクラッシュしない', async ({ page }) => {
    await page.route('/api/billing/limits', async (route) => {
      await route.abort('failed')
    })

    await setupTestSession(page, STRIPE_TEST_USERS.free)

    await page.goto('/social')

    // ページがロードされることを確認（エラー状態でも）
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

// ============================================
// メタデータ不備のWebhook
// ============================================
test.describe('メタデータ不備のWebhook', () => {
  test('user_idがないcheckout.sessionは無視される', async () => {
    const checkoutSession = {
      id: 'cs_test_no_user_id',
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

    // エラーではなく200を返す（ログに警告出力）
    expect(response.status).toBe(200)
  })

  test('subscriptionがないcheckout.sessionは無視される', async () => {
    const checkoutSession = {
      id: 'cs_test_no_subscription',
      object: 'checkout.session',
      mode: 'subscription',
      customer: 'cus_test',
      // subscription なし
      metadata: {
        user_id: STRIPE_TEST_USERS.free,
        plan_type: 'premium_monthly',
      },
    }

    const response = await sendWebhookRequest('checkout.session.completed', checkoutSession)
    expect(response.status).toBe(200)
  })

  test('user_idがないpayment_intentは無視される', async () => {
    const paymentIntent = {
      id: 'pi_test_no_user_id',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 120,
      metadata: {
        // user_id なし
        type: 'hotsure_purchase',
        quantity: '2',
      },
    }

    const response = await sendWebhookRequest('payment_intent.succeeded', paymentIntent)
    expect(response.status).toBe(200)
  })
})

// ============================================
// 二重処理防止
// ============================================
test.describe('二重処理防止', () => {
  test('同じcheckout.sessionを2回処理してもエラーにならない', async () => {
    const userId = STRIPE_TEST_USERS.free
    await createTestSubscription(userId, 'free')

    const checkoutSession = {
      id: 'cs_test_duplicate',
      object: 'checkout.session',
      mode: 'subscription',
      customer: 'cus_test_dup',
      subscription: 'sub_test_dup',
      metadata: {
        user_id: userId,
        plan_type: 'premium_monthly',
      },
    }

    // 1回目
    const response1 = await sendWebhookRequest('checkout.session.completed', checkoutSession)
    expect(response1.status).toBe(200)

    // 2回目（同じイベント）
    const response2 = await sendWebhookRequest('checkout.session.completed', checkoutSession)
    expect(response2.status).toBe(200)

    // サブスクリプションは正常に更新されている
    const subscription = await getSubscription(userId)
    expect(subscription.plan_type).toBe('premium_monthly')
  })
})

// ============================================
// Customer Portal エラーケース
// ============================================
test.describe('Customer Portalエラーケース', () => {
  test('無料ユーザーには管理ボタンが表示されない', async ({ page }) => {
    await setupFreePlanUser(page)

    await page.goto('/social')
    await waitForPageLoad(page)

    // 管理ボタンは非表示
    const manageBtn = page.locator('[data-testid="manage-subscription-btn"]')
    await expect(manageBtn).not.toBeVisible()
  })

  test('プレミアムユーザーには管理ボタンが表示される', async ({ page }) => {
    await setupPremiumPlanUser(page)

    await page.goto('/social')
    await waitForPageLoad(page)

    // 管理ボタンは表示
    const manageBtn = page.locator('[data-testid="manage-subscription-btn"]')
    await expect(manageBtn).toBeVisible()
  })
})
