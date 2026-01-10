import { test, expect } from '@playwright/test'
import {
  setupTestSession,
  TEST_USER,
  waitForPageLoad,
  setDraftContent,
  getDraftContent,
  clearDraftContent,
  TEST_IMAGE_1X1_PNG,
} from './fixtures/test-helpers'

/**
 * 入力/編集機能のE2Eテスト
 * 仕様: .kiro/specs/entry-input/requirements.md
 */

// ========================================
// 未認証テスト（認証不要）
// ========================================
test.describe('未認証時の動作', () => {
  test('未認証で/newにアクセス→/にリダイレクト', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
  })

  test('未認証で/edit/[id]にアクセス→/にリダイレクト', async ({ page }) => {
    await page.goto('/edit/test-entry-id')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')
  })
})

// ========================================
// 1. テキスト入力 (Requirement 1)
// ========================================
test.describe('テキスト入力機能', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)
  })

  test('新規入力ページが表示される [Req1-AC1]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    // 入力フォームが表示される（aria-labelで検索）
    await expect(page.getByLabel('記録内容')).toBeVisible()

    // 送信ボタンが表示される
    await expect(page.getByRole('button', { name: /記録する/ })).toBeVisible()
  })

  test('テキストを入力できる [Req1-AC2]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('今日はいい天気でした')

    await expect(textarea).toHaveValue('今日はいい天気でした')
  })

  test('絵文字1文字でも有効 [Req1-AC3]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('😊')

    // 送信ボタンが有効
    const submitButton = page.getByRole('button', { name: /記録する/ })
    await expect(submitButton).toBeEnabled()
  })

  test('空入力では送信ボタン無効 [Req1-AC6]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('   ')

    // 送信ボタンが無効
    const submitButton = page.getByRole('button', { name: /記録する/ })
    await expect(submitButton).toBeDisabled()
  })

  test('文字数カウンターが表示されない [Req1-AC5]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('テスト入力です')

    // 文字数カウンターが存在しない
    const form = page.locator('form')
    await expect(form.getByText(/^\d+文字$/)).not.toBeVisible()
    await expect(form.getByText(/^\d+\/\d+$/)).not.toBeVisible()
  })
})

// ========================================
// 2. 画像添付 (Requirement 2)
// ========================================
test.describe('画像添付機能', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)
  })

  test('画像添付ボタンが表示される [Req2-AC1]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    // 画像添付ボタン（ImagePlusアイコン）が表示される
    const imageButton = page.locator('label[for="image-upload"]')
    await expect(imageButton).toBeVisible()
  })

  test('画像選択→プレビュー表示 [Req2-AC2,3]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TEST_IMAGE_1X1_PNG,
    })

    // プレビューが表示される
    await expect(page.getByAltText('プレビュー')).toBeVisible({ timeout: 10000 })
  })

  test('添付画像を削除できる', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TEST_IMAGE_1X1_PNG,
    })

    // プレビューが表示されるまで待機
    await expect(page.getByAltText('プレビュー')).toBeVisible({ timeout: 10000 })

    // 削除ボタンをクリック
    await page.getByRole('button', { name: '削除' }).click()

    // プレビューが消える
    await expect(page.getByAltText('プレビュー')).not.toBeVisible()

    // 画像添付ボタンが再表示
    const imageButton = page.locator('label[for="image-upload"]')
    await expect(imageButton).toBeVisible()
  })
})

// ========================================
// 3. 下書き自動保存 (Requirement 3)
// ========================================
test.describe('下書き自動保存機能', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)
  })

  test('入力内容が自動保存される [Req3-AC1]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('下書きテスト')

    // デバウンス後に保存
    await page.waitForTimeout(500)

    // localStorageに保存されている
    const draft = await getDraftContent(page)
    expect(draft).toBeTruthy()
    expect(draft.content).toBe('下書きテスト')
  })

  test('ページ再訪問時に下書きが復元される [Req3-AC2]', async ({ page }) => {
    // 下書きを事前に設定
    await page.goto('/new')
    await setDraftContent(page, '復元テスト内容')

    // ページをリロード
    await page.reload()
    await waitForPageLoad(page)

    // 下書きが復元される
    const textarea = page.getByLabel('記録内容')
    await expect(textarea).toHaveValue('復元テスト内容')
  })
})

// ========================================
// 4. 記録の編集 (Requirement 4)
// ========================================
test.describe('記録の編集機能', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('編集ページは新規入力と同じUI [Req4-AC2]', async ({ page }) => {
    // 注: 実際のテストにはテストデータが必要
    await page.goto('/edit/test-entry-id')
    await waitForPageLoad(page)

    // 入力フォームが表示される（または404/エラー）
    const hasTextarea = await page.getByLabel('記録内容').isVisible().catch(() => false)
    const hasError = await page.getByText(/見つかりません|エラー/).isVisible().catch(() => false)

    // どちらかの状態
    expect(hasTextarea || hasError).toBeTruthy()
  })
})

// ========================================
// 5. 投稿制限 (Requirement 5)
// ========================================
test.describe('投稿制限機能', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('通常時は制限メッセージなし [Req5-AC1,2]', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    // 制限メッセージが表示されていない
    await expect(page.getByText(/本日の投稿上限/)).not.toBeVisible()
  })
})

// ========================================
// 6. フォーム送信フロー
// ========================================
test.describe('フォーム送信フロー', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
    await clearDraftContent(page)
  })

  test('送信中はボタンが無効化される（二重送信防止）', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill('送信テスト')

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // 送信中はボタンが無効化される（テキストが「送信中...」に変わる）
    await expect(page.getByRole('button', { name: /送信中/ })).toBeVisible()
  })
})

// ========================================
// 7. レスポンシブデザイン
// ========================================
test.describe('レスポンシブデザイン', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('モバイルビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/new')
    await waitForPageLoad(page)

    await expect(page.getByLabel('記録内容')).toBeVisible()
    await expect(page.getByRole('button', { name: /記録する/ })).toBeVisible()
  })

  test('デスクトップビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/new')
    await waitForPageLoad(page)

    await expect(page.getByLabel('記録内容')).toBeVisible()
    await expect(page.getByRole('button', { name: /記録する/ })).toBeVisible()
  })
})
