import { Page } from '@playwright/test'

/**
 * E2Eテスト用ヘルパー関数
 * 認証やデータセットアップのユーティリティを提供
 */

// テストユーザー情報
export const TEST_USER = {
  id: 'test-user-id-e2e-12345',
  email: 'e2e-test@example.com',
  displayName: 'E2Eテストユーザー',
}

/**
 * ローカルSupabaseのテストユーザーでログインセッションを設定
 * 注意: 実際の認証フローではなく、セッションを直接設定する
 */
export async function setupTestSession(page: Page, userId?: string) {
  const testUserId = userId || TEST_USER.id

  // Supabase Auth形式のセッション情報を設定
  await page.addInitScript((userId) => {
    const mockSession = {
      access_token: `test-access-token-${userId}`,
      refresh_token: `test-refresh-token-${userId}`,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'e2e-test@example.com',
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'E2Eテストユーザー',
          avatar_url: null,
        },
        created_at: new Date().toISOString(),
      },
    }

    // Supabaseのローカルストレージキーを設定
    // 形式: sb-{project-ref}-auth-token
    localStorage.setItem(
      'sb-127.0.0.1:54321-auth-token',
      JSON.stringify(mockSession)
    )
  }, testUserId)
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
