import { Page } from '@playwright/test'
import type { LimitsResponse } from '../../src/features/billing/types'

/**
 * E2Eテスト用ヘルパー関数
 * 認証やデータセットアップのユーティリティを提供
 *
 * セキュリティ: TEST_USERS に定義されたユーザーIDのみ使用可能
 * e2e-auth.ts の ALLOWED_TEST_USER_IDS と同期を保つこと
 */

/**
 * E2Eテストで使用を許可されたユーザー
 * 型安全性のため、定数として定義
 */
export const TEST_USERS = {
  /** プライマリテストユーザー（基本的なテストで使用） */
  PRIMARY: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'dev@example.com',
    password: 'dev-password',
    displayName: '開発テストユーザー',
  },
  /** セカンダリテストユーザー（フォロー等の相互作用テストで使用） */
  SECONDARY: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'dev2@example.com',
    password: 'dev-password',
    displayName: '開発テストユーザー2',
  },
} as const

/** @deprecated TEST_USERS.PRIMARY を使用してください */
export const TEST_USER = TEST_USERS.PRIMARY

/**
 * E2Eテストモードの認証バイパスを使用してセッションを設定
 * setExtraHTTPHeaders でリクエストに Cookie ヘッダーを追加
 * （middleware.ts と src/lib/supabase/e2e-auth.ts を利用）
 */
export async function setupTestSession(page: Page, userId?: string) {
  const testUserId = userId || TEST_USER.id

  // ブラウザコンテキストに Cookie ヘッダーを設定
  // すべてのリクエストに e2e-test-user-id Cookie が追加される
  await page.setExtraHTTPHeaders({
    cookie: `e2e-test-user-id=${testUserId}`,
  })

  // 保護されたページに遷移
  await page.goto('/timeline')
  await waitForPageLoad(page)
}

/**
 * ログイン済みの状態でページに遷移
 */
export async function setupAuthenticatedPage(page: Page, url: string = '/timeline') {
  await setupTestSession(page)
  await page.goto(url)
  await waitForPageLoad(page)
}

/**
 * テストデータの下書きを設定
 */
export async function setDraftContent(page: Page, content: string, imagePreview?: string) {
  await page.evaluate(
    ({ content, imagePreview }) => {
      localStorage.setItem(
        'hibioru_entry_draft',
        JSON.stringify({
          content,
          imagePreview: imagePreview || null,
          savedAt: new Date().toISOString(),
        })
      )
    },
    { content, imagePreview }
  )
}

/**
 * 下書きをクリア
 */
export async function clearDraftContent(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('hibioru_entry_draft')
  })
}

/**
 * 保存された下書きを取得
 */
export async function getDraftContent(page: Page) {
  return page.evaluate(() => {
    const draft = localStorage.getItem('hibioru_entry_draft')
    return draft ? JSON.parse(draft) : null
  })
}

/**
 * テスト用の1x1ピクセルPNG画像（Base64）
 * 画像アップロードテストに使用
 */
export const TEST_IMAGE_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

/**
 * ページが完全に読み込まれるまで待機
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded')
}

/**
 * フォーム送信後の結果を待機
 * 成功時のリダイレクトまたはエラーメッセージの表示を待つ
 */
export async function waitForFormResult(page: Page) {
  await Promise.race([
    page.waitForURL('/', { timeout: 10000 }),
    page.waitForSelector('.bg-red-100', { timeout: 10000 }),
    page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 }),
  ]).catch(() => {
    // タイムアウトは許容（テスト側で結果を確認）
  })
}

/**
 * タイムラインが読み込まれるまで待機
 */
export async function waitForTimelineLoad(page: Page) {
  // 読み込み中の表示が消えるまで待機
  await page.waitForSelector('text=読み込み中...', { state: 'hidden', timeout: 10000 }).catch(() => {
    // 読み込み中が表示されない場合（すでに読み込み完了）は無視
  })
}

/**
 * 投稿リストまたは空状態が表示されるまで待機
 */
export async function waitForTimelineContent(page: Page) {
  await Promise.race([
    page.getByTestId('entry-card').first().waitFor({ timeout: 10000 }),
    page.locator('text=まだ投稿がありません').waitFor({ timeout: 10000 }),
    page.locator('text=エラーが発生しました').waitFor({ timeout: 10000 }),
  ]).catch(() => {
    // いずれかの状態になるまで待機
  })
}

/**
 * スクロールして追加データを読み込む
 */
export async function scrollToLoadMore(page: Page, scrollAmount: number = 1000) {
  const scrollContainer = page.getByTestId('timeline-list')
  await scrollContainer.evaluate((el, amount) => {
    el.scrollTop += amount
  }, scrollAmount)
  // スクロール後のデータ読み込みを待機
  await page.waitForTimeout(500)
}

/**
 * カレンダーを開く
 */
export async function openCalendar(page: Page) {
  const calendarButton = page.getByRole('button', { name: /カレンダーを開く/ })
  await calendarButton.click()
  // カレンダーが表示されるまで待機（DayPicker v9はcalendar-monthクラスを持つ）
  await page.locator('.calendar-month').waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * カレンダーを閉じる
 */
export async function closeCalendar(page: Page) {
  // 背景オーバーレイをクリック（month-calendar.tsxの実装を参照）
  // カレンダーがオーバーレイの上に表示されるため、カレンダーと重ならない位置をクリック
  const overlay = page.locator('.fixed.inset-0.z-30.bg-black\\/20')
  const isVisible = await overlay.isVisible().catch(() => false)
  if (isVisible) {
    // オーバーレイの左上端をクリック（カレンダーは中央に表示されるため）
    await overlay.click({ position: { x: 10, y: 10 } })
    await page.locator('.calendar-month').waitFor({ state: 'hidden', timeout: 5000 })
  }
}

// ============================================
// Billing機能テスト用ヘルパー
// ============================================

// Billingテスト用ユーザー（UUID形式）
export const BILLING_TEST_USERS = {
  free: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'billing-free@test.example.com',
    displayName: 'Billing Free User',
  },
  premium: {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'billing-premium@test.example.com',
    displayName: 'Billing Premium User',
    stripeCustomerId: 'cus_test_premium',
    stripeSubscriptionId: 'sub_test_premium',
  },
  canceled: {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'billing-canceled@test.example.com',
    displayName: 'Billing Canceled User',
    stripeCustomerId: 'cus_test_canceled',
  },
}

/**
 * /api/billing/limits のモックレスポンス設定
 * APIルートをインターセプトして指定のレスポンスを返す
 */
export async function mockBillingLimitsAPI(page: Page, response: Partial<LimitsResponse>) {
  const defaultResponse: LimitsResponse = {
    planType: 'free',
    entryLimit: {
      allowed: true,
      current: 0,
      limit: 15,
      remaining: 15,
      planType: 'free',
    },
    imageLimit: {
      allowed: true,
      current: 0,
      limit: 5,
      remaining: 5,
      planType: 'free',
    },
    canceledAt: null,
    currentPeriodEnd: null,
    hotsureRemaining: 2,
    bonusHotsure: 0,
  }

  const mergedResponse = { ...defaultResponse, ...response }

  await page.route('/api/billing/limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mergedResponse),
    })
  })
}

/**
 * 無料プランユーザーとしてセッション設定し、APIをモック
 */
export async function setupFreePlanUser(
  page: Page,
  options?: {
    entryCount?: number
    imageCount?: number
  }
) {
  const entryCount = options?.entryCount ?? 0
  const imageCount = options?.imageCount ?? 0

  // セッション設定
  await setupTestSession(page, BILLING_TEST_USERS.free.id)

  // 制限APIモック
  await mockBillingLimitsAPI(page, {
    planType: 'free',
    entryLimit: {
      allowed: entryCount < 15,
      current: entryCount,
      limit: 15,
      remaining: 15 - entryCount,
      planType: 'free',
    },
    imageLimit: {
      allowed: imageCount < 5,
      current: imageCount,
      limit: 5,
      remaining: 5 - imageCount,
      planType: 'free',
    },
    canceledAt: null,
    currentPeriodEnd: null,
  })
}

/**
 * プレミアムプランユーザーとしてセッション設定し、APIをモック
 */
export async function setupPremiumPlanUser(
  page: Page,
  planType: 'premium_monthly' | 'premium_yearly' = 'premium_monthly'
) {
  // セッション設定
  await setupTestSession(page, BILLING_TEST_USERS.premium.id)

  // 次月の期限日
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  // 制限APIモック
  await mockBillingLimitsAPI(page, {
    planType,
    entryLimit: {
      allowed: true,
      current: 0,
      limit: null,
      remaining: null,
      planType,
    },
    imageLimit: {
      allowed: true,
      current: 0,
      limit: null,
      remaining: null,
      planType,
    },
    canceledAt: null,
    currentPeriodEnd: nextMonth.toISOString(),
  })
}

/**
 * キャンセル済みプレミアムユーザーとしてセッション設定し、APIをモック
 */
export async function setupCanceledPlanUser(
  page: Page,
  periodEnd: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
) {
  // セッション設定
  await setupTestSession(page, BILLING_TEST_USERS.canceled.id)

  const canceledAt = new Date()
  canceledAt.setDate(canceledAt.getDate() - 3) // 3日前にキャンセル

  // 制限APIモック（キャンセル後も期限まではプレミアム機能利用可）
  await mockBillingLimitsAPI(page, {
    planType: 'premium_monthly',
    entryLimit: {
      allowed: true,
      current: 0,
      limit: null,
      remaining: null,
      planType: 'premium_monthly',
    },
    imageLimit: {
      allowed: true,
      current: 0,
      limit: null,
      remaining: null,
      planType: 'premium_monthly',
    },
    canceledAt: canceledAt.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
  })
}

/**
 * Stripe Checkoutへのリダイレクトをインターセプト
 * リダイレクト先URLを取得してリダイレクトを中断する
 */
export async function interceptStripeCheckout(page: Page): Promise<{ getRedirectUrl: () => string | null }> {
  let redirectUrl: string | null = null

  // Mock the Stripe Checkout redirect
  await page.route('**/checkout.stripe.com/**', async (route) => {
    redirectUrl = route.request().url()
    await route.abort()
  })

  // Intercept navigation to Stripe Checkout and capture the URL
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url()
      if (url.includes('checkout.stripe.com')) {
        redirectUrl = url
      }
    }
  })

  return {
    getRedirectUrl: () => redirectUrl,
  }
}

/**
 * Stripe Customer Portalへのリダイレクトをインターセプト
 */
export async function interceptStripePortal(page: Page): Promise<{ getRedirectUrl: () => string | null }> {
  let redirectUrl: string | null = null

  await page.route('**/billing.stripe.com/**', async (route) => {
    redirectUrl = route.request().url()
    await route.abort()
  })

  return {
    getRedirectUrl: () => redirectUrl,
  }
}

/**
 * BillingSectionが表示されるまで待機
 */
export async function waitForBillingSection(page: Page) {
  await page.waitForSelector('[data-testid="billing-section"]', { timeout: 10000 })
}

/**
 * プラン選択ページの読み込み完了を待機
 */
export async function waitForPlansPage(page: Page) {
  await page.waitForSelector('[data-testid="plan-card-monthly"]', { timeout: 10000 })
  await page.waitForSelector('[data-testid="plan-card-yearly"]', { timeout: 10000 })
}

// ============================================
// Stripe統合テスト用ヘルパー（再エクスポート）
// ============================================
// DB検証やWebhookテストで使用するヘルパーはstripe-helpers.tsからインポート
// 例: import { getSubscription, getBonusHotsure } from './fixtures/stripe-helpers'

// ============================================
// waitForTimeout代替ヘルパー
// ============================================

/**
 * API応答を待機（waitForTimeoutの代替）
 * @param page Playwrightページ
 * @param urlPattern 待機するAPIのURLパターン（文字列または正規表現）
 * @param options オプション設定
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number; statusCode?: number }
) {
  const timeout = options?.timeout ?? 10000
  const expectedStatus = options?.statusCode ?? 200

  return page.waitForResponse(
    (response) => {
      const matches =
        typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url())
      return matches && response.status() === expectedStatus
    },
    { timeout }
  )
}

/**
 * 要素が表示されるまで待機（waitForTimeoutの代替）
 * @param page Playwrightページ
 * @param selector CSSセレクタ
 * @param options オプション設定
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }
) {
  const timeout = options?.timeout ?? 10000
  const state = options?.state ?? 'visible'

  await page.waitForSelector(selector, { state, timeout })
}
