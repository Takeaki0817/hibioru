import { Page } from '@playwright/test'
import type { LimitsResponse } from '../../src/features/billing/types'

/**
 * E2Eテスト用ヘルパー関数
 * 認証やデータセットアップのユーティリティを提供
 */

// テストユーザー情報（DBに登録済みの開発ユーザーを使用）
export const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.com',
  password: 'dev-password',
  displayName: '開発テストユーザー',
}

// ローカルSupabaseの設定
const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/**
 * Supabase REST APIを使用してログインし、セッションを設定
 * Node.js側でAPIを呼び出し、結果をブラウザに注入する
 */
export async function setupTestSession(page: Page, userId?: string) {
  // Node.js側でSupabase REST APIを呼び出してログイン
  const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  })

  if (!loginResponse.ok) {
    const errorData = await loginResponse.json()
    throw new Error(`ログイン失敗: ${errorData.error_description || errorData.msg || 'Unknown error'}`)
  }

  const data = await loginResponse.json()
  const { access_token, refresh_token, user, expires_in } = data

  // セッションデータを構築
  const sessionData = {
    access_token,
    refresh_token,
    token_type: 'bearer',
    expires_in,
    expires_at: Math.floor(Date.now() / 1000) + expires_in,
    user,
  }

  // ページに遷移してセッションを設定
  await page.goto('/')
  await waitForPageLoad(page)

  // localStorageにセッションを保存
  await page.evaluate(
    ({ sessionData }) => {
      const storageKey = 'sb-127-auth-token'
      localStorage.setItem(storageKey, JSON.stringify(sessionData))
    },
    { sessionData }
  )

  // Cookieにもセッションを設定（@supabase/ssrが使用）
  // Supabase SSRはデフォルトでJSONをそのまま保存（base64urlはオプション）
  // 大きな値はチャンク化される（.0, .1, .2...）
  const sessionJson = JSON.stringify(sessionData)

  // チャンクサイズは約3180バイト
  const CHUNK_SIZE = 3180
  const chunks: string[] = []
  for (let i = 0; i < sessionJson.length; i += CHUNK_SIZE) {
    chunks.push(sessionJson.slice(i, i + CHUNK_SIZE))
  }

  // チャンク化されたCookieを設定
  const cookies = chunks.map((chunk, index) => ({
    name: index === 0 && chunks.length === 1 ? 'sb-127-auth-token' : `sb-127-auth-token.${index}`,
    value: chunk,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }))

  await page.context().addCookies(cookies)

  // セッションを反映するため再遷移（reloadより安定）
  await page.goto('/', { waitUntil: 'networkidle' })
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
  await page.waitForLoadState('networkidle')
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
    page.waitForSelector('[data-testid="entry-card"]', { timeout: 10000 }),
    page.waitForSelector('text=まだ投稿がありません', { timeout: 10000 }),
    page.waitForSelector('text=エラーが発生しました', { timeout: 10000 }),
  ]).catch(() => {
    // いずれかの状態になるまで待機
  })
}

/**
 * スクロールして追加データを読み込む
 */
export async function scrollToLoadMore(page: Page, scrollAmount: number = 1000) {
  const scrollContainer = page.locator('[class*="overflow-auto"]')
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
  const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
  await calendarButton.click()
  // カレンダーが表示されるまで待機
  await page.waitForSelector('.rdp', { state: 'visible', timeout: 5000 })
}

/**
 * カレンダーを閉じる
 */
export async function closeCalendar(page: Page) {
  const overlay = page.locator('.fixed.inset-0.bg-black\\/20')
  const isVisible = await overlay.isVisible().catch(() => false)
  if (isVisible) {
    await overlay.click()
    await page.waitForSelector('.rdp', { state: 'hidden', timeout: 5000 })
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

  await page.route('**/checkout.stripe.com/**', async (route) => {
    redirectUrl = route.request().url()
    await route.abort()
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
