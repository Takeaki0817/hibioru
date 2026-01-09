import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USER, waitForPageLoad } from './fixtures/test-helpers'

/**
 * 認証機能のE2Eテスト
 * 仕様: .kiro/specs/auth/requirements.md
 */

// ========================================
// 1. ログイン機能 (Requirements 1, 2)
// ========================================
test.describe('ログイン機能', () => {
  test('ログイン画面の基本UI表示 [Req2-AC1,2]', async ({ page }) => {
    await page.goto('/')

    // サービス名とキャッチコピー
    await expect(page.getByText('ヒビオル')).toBeVisible()
    await expect(page.getByText('日々を織る')).toBeVisible()

    // Googleログインボタンのみ表示
    const googleButton = page.getByRole('button', { name: /Google/i })
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()

    // 他のログイン方法がないことを確認
    await expect(page.getByRole('textbox', { name: /email/i })).not.toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).not.toBeVisible()
  })

  test('Googleボタンのアクセシビリティ [Req2-AC3]', async ({ page }) => {
    await page.goto('/')

    const googleButton = page.getByRole('button', { name: /Google/i })

    // アクセシビリティ属性
    await expect(googleButton).toHaveAttribute('aria-label', 'Googleでログイン')

    // Googleアイコン（SVG）の存在
    const svg = googleButton.locator('svg')
    await expect(svg).toBeVisible()
  })

  test('認証キャンセル時はエラーなしでログインに戻る [Req1-AC5]', async ({ page }) => {
    // 認証キャンセルのコールバック
    await page.goto('/auth/callback?error=access_denied')

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/')

    // エラーメッセージは表示されない
    await expect(page.getByText(/ログインできませんでした/)).not.toBeVisible()

    // 再度ログイン可能
    await expect(page.getByRole('button', { name: /Google/i })).toBeEnabled()
  })

  test('未認証でルートアクセス→公開ページ表示（ルートは公開パス） [Req7-AC2]', async ({ page }) => {
    await page.goto('/')
    // ルートパスは公開パスなのでリダイレクトされない
    await expect(page).toHaveURL('/')
    // ヒビオルまたはログインリンクが表示される
    await expect(page.getByText('ヒビオル')).toBeVisible()
  })
})

// ========================================
// 2. 認証状態管理 (Requirement 4)
// ========================================
test.describe('認証状態管理', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('ログイン後のセッション維持 [Req4-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // タイムラインが表示される
    await expect(page).toHaveURL('/timeline')

    // ページリロード
    await page.reload()
    await waitForPageLoad(page)

    // 再認証なしでタイムラインが表示される
    await expect(page).toHaveURL('/timeline')
    await expect(page).toHaveURL('/timeline')
  })

  test('有効なセッションで保護ページアクセス [Req4-AC2]', async ({ page }) => {
    // タイムライン
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/timeline')

    // ソーシャル
    await page.goto('/social')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/social')
  })

  test('認証済みで/アクセス→/timelineにリダイレクト [Req7-AC3]', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/timeline')
  })
})

// ========================================
// 3. ログアウト機能 (Requirement 5)
// ========================================
test.describe('ログアウト機能', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('ログアウトボタンが表示される [Req5-AC1]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // プロフィールタブを選択（必要に応じて）
    const profileTab = page.getByRole('tab', { name: /プロフィール/i })
    if (await profileTab.isVisible()) {
      await profileTab.click()
    }

    // ログアウトボタンが表示される
    await expect(page.getByRole('button', { name: /ログアウト/i })).toBeVisible()
  })

  test('ログアウト実行→/にリダイレクト [Req5-AC2,3]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ログアウトボタンをクリック
    const logoutButton = page.getByRole('button', { name: /ログアウト/i })
    await logoutButton.click()

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/')

    // 再度保護ページにアクセスできない
    await page.goto('/timeline')
    await expect(page).toHaveURL('/')
  })
})

// ========================================
// 4. エラーハンドリング (Requirement 6)
// ========================================
test.describe('エラーハンドリング', () => {
  test('エラーパラメータでエラーメッセージ表示 [Req6-AC1]', async ({ page }) => {
    await page.goto('/?error=auth_failed')

    // エラーメッセージが表示される
    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()
  })

  test('再試行ボタンでエラークリア [Req6-AC4]', async ({ page }) => {
    await page.goto('/?error=auth_failed')

    // エラーメッセージが表示される
    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()

    // 再試行ボタンをクリック
    await page.getByText(/もう一度試す/).click()

    // エラーメッセージが消える
    await expect(page.getByText(/ログインできませんでした/)).not.toBeVisible()

    // ログインボタンは引き続き使用可能
    await expect(page.getByRole('button', { name: /Google/i })).toBeEnabled()
  })

  test('アプリがクラッシュせずに動作 [Req6-AC3]', async ({ page }) => {
    // 不正なエラーパラメータ
    await page.goto('/?error=unknown_error_type_xyz')

    // ページが正常に表示される（クラッシュしない）
    await expect(page.getByText('ヒビオル')).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })
})

// ========================================
// 5. ルート保護 (Requirement 7)
// ========================================
test.describe('ルート保護', () => {
  test('未認証で保護ページ→/にリダイレクト [Req7-AC1]', async ({ page }) => {
    // タイムライン
    await page.goto('/timeline')
    await expect(page).toHaveURL('/')

    // ソーシャル
    await page.goto('/social')
    await expect(page).toHaveURL('/')

    // 新規投稿
    await page.goto('/new')
    await expect(page).toHaveURL('/')
  })

  test('公開パスはリダイレクトされない [Req7-AC2]', async ({ page }) => {
    // ログイン（ルート）
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('ヒビオル')).toBeVisible()

    // オフライン
    await page.goto('/offline')
    await expect(page).not.toHaveURL('/')

    // LP（存在確認）
    const lpResponse = await page.goto('/lp', { waitUntil: 'domcontentloaded' })
    // LPページが存在すればリダイレクトされない
    if (lpResponse?.ok()) {
      await expect(page).toHaveURL('/lp')
    }
  })
})

// ========================================
// 6. アカウント削除 (Requirement 8)
// ========================================
test.describe('アカウント削除', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('削除ボタンが表示される [Req8-AC1]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // プロフィールタブを選択
    const profileTab = page.getByRole('tab', { name: /プロフィール/i })
    if (await profileTab.isVisible()) {
      await profileTab.click()
    }

    // ページを下にスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // 削除ボタンが表示される
    await expect(page.getByRole('button', { name: /アカウントを削除/i })).toBeVisible()
  })

  test('確認モーダルが表示される [Req8-AC2,3]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // 削除ボタンをクリック
    const deleteButton = page.getByRole('button', { name: /アカウントを削除/i })
    await deleteButton.scrollIntoViewIfNeeded()
    await deleteButton.click()

    // モーダルが表示される
    await expect(page.getByText(/アカウントを削除しますか/)).toBeVisible()

    // 「delete」入力要求
    await expect(page.getByText(/delete/i)).toBeVisible()

    // 入力フィールドとボタン
    await expect(page.getByRole('textbox')).toBeVisible()
    await expect(page.getByRole('button', { name: /キャンセル/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /削除する/i })).toBeVisible()
  })

  test('不正入力で削除ボタン無効 [Req8-AC8]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // モーダルを開く
    const deleteButton = page.getByRole('button', { name: /アカウントを削除/i })
    await deleteButton.scrollIntoViewIfNeeded()
    await deleteButton.click()

    const input = page.getByRole('textbox')
    const confirmButton = page.getByRole('button', { name: /削除する/i })

    // 大文字で入力
    await input.fill('DELETE')
    await expect(confirmButton).toBeDisabled()

    // 別の文字列
    await input.fill('abc')
    await expect(confirmButton).toBeDisabled()

    // 正しい入力
    await input.fill('delete')
    await expect(confirmButton).toBeEnabled()
  })

  test('キャンセルでモーダル閉じる', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // モーダルを開く
    const deleteButton = page.getByRole('button', { name: /アカウントを削除/i })
    await deleteButton.scrollIntoViewIfNeeded()
    await deleteButton.click()

    await expect(page.getByText(/アカウントを削除しますか/)).toBeVisible()

    // キャンセルをクリック
    await page.getByRole('button', { name: /キャンセル/i }).click()

    // モーダルが閉じる
    await expect(page.getByText(/アカウントを削除しますか/)).not.toBeVisible()
  })
})

// ========================================
// 7. レスポンシブデザイン
// ========================================
test.describe('レスポンシブデザイン', () => {
  test('モバイルビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByText('ヒビオル')).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('タブレットビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await expect(page.getByText('ヒビオル')).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('デスクトップビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')

    await expect(page.getByText('ヒビオル')).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })
})
