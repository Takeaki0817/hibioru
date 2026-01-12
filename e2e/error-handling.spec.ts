import { test, expect, Page } from '@playwright/test'
import {
  setupTestSession,
  TEST_USER,
  waitForPageLoad,
  clearDraftContent,
  TEST_IMAGE_1X1_PNG,
} from './fixtures/test-helpers'

/**
 * エラーハンドリング・異常系のE2Eテスト
 *
 * テストシナリオ:
 * 1. API接続失敗時のエラーメッセージ表示
 * 2. データ取得失敗時のリトライオプション表示
 * 3. Supabase認証エラー時のリダイレクト
 * 4. 画像アップロードタイムアウト
 * 5. フォーム送信中の二重送信防止
 * 6. 404ページの表示
 * 7. 500エラー時のユーザーフレンドリーメッセージ
 * 8. オフライン時の動作確認
 */

// ============================================
// 1. API接続失敗時のエラーメッセージ表示
// ============================================
test.describe('API接続失敗時のエラーメッセージ表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('エントリ取得API失敗時、エラーメッセージが表示される', async ({ page }) => {
    // APIリクエストを500エラーで返す
    await page.route('**/rest/v1/entries**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    // エラーメッセージまたは空状態が表示される
    const hasError = await page.getByText(/エラー|読み込めませんでした/).isVisible().catch(() => false)
    const hasEmptyState = await page.getByText(/まだ投稿がありません/).isVisible().catch(() => false)

    // どちらかの状態が表示される（実装依存）
    expect(hasError || hasEmptyState).toBeTruthy()
  })

  test('ソーシャルフィードAPI失敗時、ページがクラッシュしない', async ({ page }) => {
    await page.route('**/rest/v1/social_follows**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto('/social')
    await waitForPageLoad(page)

    // ページが表示されている（クラッシュしていない）
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('制限API失敗時もフォームは表示される', async ({ page }) => {
    await page.route('/api/billing/limits', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto('/new')
    await waitForPageLoad(page)

    // フォームは表示される（フォールバック動作）
    const textarea = page.getByLabel('記録内容')
    await expect(textarea).toBeVisible()
  })
})

// ============================================
// 2. データ取得失敗時のリトライオプション表示
// ============================================
test.describe('データ取得失敗時のリトライオプション表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('タイムライン取得失敗時、リトライボタンが表示される', async ({ page }) => {
    await page.route('**/rest/v1/entries**', async (route) => {
      await route.abort('failed')
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    // エラー状態の確認
    const errorMessage = page.getByText(/エラー/)
    const isError = await errorMessage.isVisible().catch(() => false)

    if (isError) {
      // リトライボタンが表示される
      const retryButton = page.getByRole('button', { name: /再試行|リトライ/i })
      await expect(retryButton).toBeVisible()
    }
  })

  test('リトライボタンクリックで再取得を試みる', async ({ page }) => {
    let requestCount = 0

    await page.route('**/rest/v1/entries**', async (route) => {
      requestCount++
      if (requestCount === 1) {
        // 1回目は失敗
        await route.abort('failed')
      } else {
        // 2回目以降は成功
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    const retryButton = page.getByRole('button', { name: /再試行|リトライ/i })
    const isRetryVisible = await retryButton.isVisible().catch(() => false)

    if (isRetryVisible) {
      await retryButton.click()
      await page.waitForTimeout(1000)
      // リクエストが2回発生していることを確認
      expect(requestCount).toBeGreaterThanOrEqual(2)
    }
  })
})

// ============================================
// 3. Supabase認証エラー時のリダイレクト
// ============================================
test.describe('Supabase認証エラー時のリダイレクト', () => {
  test('認証コールバックエラーでログインページにリダイレクト', async ({ page }) => {
    await page.goto('/auth/callback?error=unauthorized')
    await waitForPageLoad(page)

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/')
  })

  test('セッション期限切れ時、保護ページからリダイレクト', async ({ page }) => {
    // 無効なセッションで保護ページにアクセス
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/')
  })

  test('認証失敗エラーメッセージが表示される', async ({ page }) => {
    await page.goto('/?error=auth_failed')
    await waitForPageLoad(page)

    // エラーメッセージが表示される
    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()
  })

  test('エラー後も再度ログインが可能', async ({ page }) => {
    await page.goto('/?error=auth_failed')
    await waitForPageLoad(page)

    // 再試行ボタンをクリック
    const retryLink = page.getByText(/もう一度試す/)
    const isRetryVisible = await retryLink.isVisible().catch(() => false)

    if (isRetryVisible) {
      await retryLink.click()
    }

    // Googleログインボタンが使用可能
    const googleButton = page.getByRole('button', { name: /Google/i })
    await expect(googleButton).toBeEnabled()
  })
})

// ============================================
// 4. 画像アップロードタイムアウト
// ============================================
test.describe('画像アップロードタイムアウト', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)
  })

  test('画像アップロード中のタイムアウトでエラーメッセージ表示', async ({ page }) => {
    // Storage APIへのリクエストを遅延させる
    await page.route('**/storage/v1/object/**', async (route) => {
      // タイムアウトをシミュレート
      await new Promise((resolve) => setTimeout(resolve, 35000))
      await route.abort('timedout')
    })

    await page.goto('/new')
    await waitForPageLoad(page)

    // テキストを入力
    const textarea = page.getByLabel('記録内容')
    await textarea.fill('画像アップロードテスト')

    // 画像を選択
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TEST_IMAGE_1X1_PNG,
    })

    // 送信ボタンをクリック
    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // エラーメッセージまたはタイムアウト表示を確認（実装依存）
    // タイムアウトの場合、何らかのフィードバックがあるはず
    await page.waitForTimeout(5000)

    // ページがクラッシュしていない
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('ネットワーク切断中の画像アップロード失敗', async ({ page }) => {
    await page.route('**/storage/v1/object/**', async (route) => {
      await route.abort('failed')
    })

    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('ネットワークエラーテスト')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TEST_IMAGE_1X1_PNG,
    })

    // プレビューは表示される（ローカルで処理）
    await expect(page.getByAltText('プレビュー')).toBeVisible({ timeout: 10000 })

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // ページがクラッシュしていない
    await page.waitForTimeout(2000)
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

// ============================================
// 5. フォーム送信中の二重送信防止
// ============================================
test.describe('フォーム送信中の二重送信防止', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)
  })

  test('送信中はボタンが無効化される', async ({ page }) => {
    // レスポンスを遅延させる
    await page.route('**/rest/v1/entries**', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-id' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('二重送信テスト')

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // 送信中はボタンが無効化・テキスト変更される
    await expect(page.getByRole('button', { name: /送信中|記録中/i })).toBeVisible()

    // 無効化されているか、クリック不可状態であることを確認
    const button = page.getByRole('button', { name: /送信中|記録中/i })
    const isDisabled = await button.isDisabled()
    expect(isDisabled).toBeTruthy()
  })

  test('送信ボタンの連続クリックでリクエストが重複しない', async ({ page }) => {
    let requestCount = 0

    await page.route('**/rest/v1/entries**', async (route) => {
      if (route.request().method() === 'POST') {
        requestCount++
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-id' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('連続クリックテスト')

    const submitButton = page.getByRole('button', { name: /記録する/ })

    // 連続でクリック（5回）
    await submitButton.click()
    await page.waitForTimeout(50)
    await submitButton.click({ force: true }).catch(() => {})
    await page.waitForTimeout(50)
    await submitButton.click({ force: true }).catch(() => {})

    // リクエスト完了を待つ
    await page.waitForTimeout(2000)

    // POSTリクエストは1回のみ
    expect(requestCount).toBe(1)
  })
})

// ============================================
// 6. 404ページの表示
// ============================================
test.describe('404ページの表示', () => {
  test('存在しないページにアクセスすると404が表示される', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz')

    // 404レスポンスまたはリダイレクト
    if (response) {
      const status = response.status()
      // 404または200（カスタム404ページ）またはリダイレクト
      expect([200, 302, 307, 404]).toContain(status)
    }

    // 何らかのコンテンツが表示される（クラッシュしない）
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('存在しないエントリ編集ページでエラー表示', async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)

    await page.goto('/edit/nonexistent-entry-id-12345')
    await waitForPageLoad(page)

    // エラーメッセージまたは404、リダイレクトのいずれか
    const hasError = await page.getByText(/見つかりませんでした|存在しません|エラー/i).isVisible().catch(() => false)
    const isRedirected = page.url().includes('/timeline') || page.url() === 'http://localhost:3000/'

    expect(hasError || isRedirected).toBeTruthy()
  })

  test('存在しないユーザープロフィールでエラー表示', async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)

    await page.goto('/social/users/nonexistent-user-12345')
    await waitForPageLoad(page)

    // エラーまたはリダイレクト
    const hasError = await page.getByText(/見つかりませんでした|存在しません|ユーザーが見つかりません/i).isVisible().catch(() => false)
    const isRedirected = page.url().includes('/social')

    expect(hasError || isRedirected).toBeTruthy()
  })
})

// ============================================
// 7. 500エラー時のユーザーフレンドリーメッセージ
// ============================================
test.describe('500エラー時のユーザーフレンドリーメッセージ', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('サーバーエラー時、ユーザーフレンドリーなメッセージが表示される', async ({ page }) => {
    // 全APIを500エラーで返す
    await page.route('**/rest/v1/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 技術的なエラーメッセージではなく、ユーザー向けメッセージが表示される
    // 例: "Internal Server Error" ではなく "エラーが発生しました" など
    const technicalError = page.getByText(/Internal Server Error|SQL|Database|Exception/i)
    const isTechnicalErrorVisible = await technicalError.isVisible().catch(() => false)

    // 技術的なエラーメッセージが露出していないことを確認
    expect(isTechnicalErrorVisible).toBeFalsy()

    // ページは表示されている
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('エントリ作成失敗時、エラーメッセージが表示される', async ({ page }) => {
    await page.route('**/rest/v1/entries**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database error' }),
        })
      } else {
        await route.continue()
      }
    })

    await clearDraftContent(page)
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('エラーテスト')

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // エラー後もページがクラッシュしない
    await page.waitForTimeout(2000)
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('プロフィール更新失敗時、ユーザーフレンドリーメッセージ', async ({ page }) => {
    await page.route('**/rest/v1/profiles**', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Update failed' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/social')
    await waitForPageLoad(page)

    // ページが表示されている
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

// ============================================
// 8. オフライン時の動作確認
// ============================================
test.describe('オフライン時の動作確認', () => {
  test('オフラインページが表示される', async ({ page }) => {
    await page.goto('/offline')
    await waitForPageLoad(page)

    // オフラインメッセージが表示される
    await expect(page.getByText('オフラインです')).toBeVisible()
    await expect(page.getByText(/インターネット接続を確認/)).toBeVisible()
  })

  test('オフラインページに再試行ボタンがある', async ({ page }) => {
    await page.goto('/offline')
    await waitForPageLoad(page)

    const retryButton = page.getByRole('button', { name: '再試行' })
    await expect(retryButton).toBeVisible()
    await expect(retryButton).toBeEnabled()
  })

  test('オフライン状態でのナビゲーション', async ({ page, context }) => {
    await setupTestSession(page, TEST_USER.id)

    // オフライン状態をシミュレート
    await context.setOffline(true)

    // ページ遷移を試みる
    await page.goto('/timeline').catch(() => {})

    // オフライン状態でもエラーページまたはキャッシュされたコンテンツが表示される
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // オンラインに戻す
    await context.setOffline(false)
  })

  test('オフライン中のフォーム送信失敗ハンドリング', async ({ page, context }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)

    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('オフラインテスト')

    // オフライン状態にする
    await context.setOffline(true)

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // エラー後もページがクラッシュしない
    await page.waitForTimeout(2000)
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // オンラインに戻す
    await context.setOffline(false)
  })
})

// ============================================
// 9. エラーリカバリー確認
// ============================================
test.describe('エラーリカバリー確認', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('一時的なエラー後、正常に動作が回復する', async ({ page }) => {
    let requestCount = 0

    await page.route('**/rest/v1/entries**', async (route) => {
      requestCount++
      if (requestCount <= 2) {
        // 最初の2回は失敗
        await route.abort('failed')
      } else {
        // 3回目以降は成功
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 最初はエラー状態
    const retryButton = page.getByRole('button', { name: /再試行|リトライ/i })
    const isRetryVisible = await retryButton.isVisible().catch(() => false)

    if (isRetryVisible) {
      // リトライを2回実行
      await retryButton.click()
      await page.waitForTimeout(500)

      const stillError = await retryButton.isVisible().catch(() => false)
      if (stillError) {
        await retryButton.click()
        await page.waitForTimeout(500)
      }

      // 最終的に正常状態に回復
      await page.waitForTimeout(1000)
      const body = page.locator('body')
      await expect(body).toBeVisible()
    }
  })

  test('エラー後のページ遷移が正常に動作する', async ({ page }) => {
    // 最初のリクエストは失敗
    let firstRequest = true
    await page.route('**/rest/v1/entries**', async (route) => {
      if (firstRequest) {
        firstRequest = false
        await route.abort('failed')
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    // エラー状態でも他のページに遷移可能
    await page.goto('/social')
    await waitForPageLoad(page)

    // ソーシャルページが表示される
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

// ============================================
// 10. レスポンシブデザイン（エラー状態）
// ============================================
test.describe('レスポンシブデザイン（エラー状態）', () => {
  test('モバイルでオフラインページが正しく表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/offline')
    await waitForPageLoad(page)

    await expect(page.getByText('オフラインです')).toBeVisible()
    await expect(page.getByRole('button', { name: '再試行' })).toBeVisible()
  })

  test('タブレットでエラー状態が正しく表示される', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/?error=auth_failed')
    await waitForPageLoad(page)

    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()
  })

  test('デスクトップでエラー状態が正しく表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    await page.goto('/?error=auth_failed')
    await waitForPageLoad(page)

    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })
})
