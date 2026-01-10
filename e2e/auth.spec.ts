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
    await waitForPageLoad(page)

    // サービス名とキャッチコピー
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '日々を織る' })).toBeVisible()

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
    await waitForPageLoad(page)

    // Googleログインボタンが存在する
    const googleButton = page.getByRole('button', { name: /Google/i })
    await expect(googleButton).toBeVisible()

    // Googleアイコン（imgまたはsvg）の存在
    const icon = googleButton.locator('img, svg')
    await expect(icon.first()).toBeVisible()
  })

  test('認証キャンセル時はエラーなしでログインに戻る [Req1-AC5]', async ({ page }) => {
    // 認証キャンセルのコールバック
    await page.goto('/auth/callback?error=access_denied')
    await waitForPageLoad(page)

    // ログインページにリダイレクト
    await expect(page).toHaveURL('/')

    // エラーメッセージは表示されない
    await expect(page.getByText(/ログインできませんでした/)).not.toBeVisible()

    // 再度ログイン可能
    await expect(page.getByRole('button', { name: /Google/i })).toBeEnabled()
  })

  test('未認証でルートアクセス→公開ページ表示（ルートは公開パス） [Req7-AC2]', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
    // ルートパスは公開パスなのでリダイレクトされない
    await expect(page).toHaveURL('/')
    // ヒビオルまたはログインリンクが表示される
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
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

  test.skip('認証済みで/アクセス→/timelineにリダイレクト [Req7-AC3]', async ({ page }) => {
    // TODO: 認証済みユーザーの/→/timelineリダイレクト機能が未実装
    // 現状アプリは認証済みでも/にアクセス可能（リダイレクトしない）
    await page.goto('/')
    await waitForPageLoad(page)
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

    // 設定タブが選択されていることを確認（デフォルト）
    // ログアウトボタンが表示される
    await expect(page.getByRole('button', { name: /ログアウト/i })).toBeVisible()
  })

  test('ログアウト確認ダイアログが表示される [Req5-AC2,3]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ログアウトボタンをクリック（ダイアログを開く）
    await page.getByRole('button', { name: /ログアウト/i }).first().click()

    // 確認ダイアログが表示される
    await expect(page.getByText('ログアウトしますか？')).toBeVisible()
    await expect(page.getByText('Googleアカウントで認証が必要')).toBeVisible()

    // キャンセルボタンとログアウトボタンが表示される
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: /キャンセル/i })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /ログアウト/i })).toBeVisible()

    // キャンセルでダイアログが閉じる
    await dialog.getByRole('button', { name: /キャンセル/i }).click()
    await expect(page.getByText('ログアウトしますか？')).not.toBeVisible()
  })
})

// ========================================
// 4. エラーハンドリング (Requirement 6)
// ========================================
test.describe('エラーハンドリング', () => {
  test('エラーパラメータでエラーメッセージ表示 [Req6-AC1]', async ({ page }) => {
    await page.goto('/?error=auth_failed')
    await waitForPageLoad(page)

    // エラーメッセージが表示される
    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()
  })

  test('再試行ボタンでエラークリア [Req6-AC4]', async ({ page }) => {
    await page.goto('/?error=auth_failed')
    await waitForPageLoad(page)

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
    await waitForPageLoad(page)

    // ページが正常に表示される（クラッシュしない）
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
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
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')

    // ソーシャル
    await page.goto('/social')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')

    // 新規投稿
    await page.goto('/new')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')
  })

  test('公開パスはリダイレクトされない [Req7-AC2]', async ({ page }) => {
    // ログイン（ルート）
    await page.goto('/')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()

    // オフライン
    await page.goto('/offline')
    await waitForPageLoad(page)
    await expect(page).not.toHaveURL('/')

    // LP（存在確認）
    const lpResponse = await page.goto('/lp', { waitUntil: 'domcontentloaded' })
    await waitForPageLoad(page)
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

    // 削除ボタンが表示される（スクロール不要で見える場合も）
    const deleteButton = page.getByRole('button', { name: /アカウントを削除/i })
    await deleteButton.scrollIntoViewIfNeeded()
    await expect(deleteButton).toBeVisible()
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
    await waitForPageLoad(page)

    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('タブレットビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await waitForPageLoad(page)

    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('デスクトップビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await waitForPageLoad(page)

    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })
})
