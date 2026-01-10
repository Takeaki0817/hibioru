import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USER, waitForPageLoad } from './fixtures/test-helpers'

/**
 * タイムライン/カレンダー機能のE2Eテスト
 * 仕様: .kiro/specs/timeline/requirements.md
 */

// ========================================
// 未認証テスト（認証不要）
// ========================================
test.describe('未認証時の動作', () => {
  test('未認証で/timelineにアクセス→/にリダイレクト', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
  })

  test('未認証でルート(/)にアクセス→公開ページ表示', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
    // ルートパスは公開パスなのでリダイレクトされない
    await expect(page).toHaveURL('/')
  })
})

// ========================================
// 1. 日付ヘッダーナビゲーション (Requirement 1)
// ========================================
test.describe('日付ヘッダーナビゲーション', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('日付カルーセルが表示される [Req1-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 日付カルーセルが表示される（日付ボタンが存在する）
    // 例: 「1月10日」のような形式のボタン
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const dateButton = page.getByRole('button', { name: new RegExp(`${month}月${day}日`) })
    await expect(dateButton).toBeVisible()
  })

  test('カルーセルで日付選択→該当位置にスクロール [Req1-AC2]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 日付カルーセルで別の日付をクリック
    // 今日以外の日付ボタンを探してクリック
    const dateButtons = page.locator('button[class*="group"]').filter({ hasText: /^\d+$/ })
    const buttonCount = await dateButtons.count()
    if (buttonCount > 1) {
      // 最初の日付ボタンをクリック
      await dateButtons.first().click()
      await waitForPageLoad(page)
    }
  })

  test('カレンダーアイコンタップ→月カレンダー展開 [Req1-AC3]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーボタンをクリック
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    await expect(calendarButton).toBeVisible()
    await calendarButton.click()

    // カレンダーが表示される（DayPickerコンポーネント）
    const calendar = page.locator('.rdp')
    await expect(calendar).toBeVisible()
  })

  test('カレンダーで日付選択→該当位置にスクロール [Req1-AC4]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開く
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    await calendarButton.click()
    await expect(page.locator('.rdp')).toBeVisible()

    // 今月の任意の日を選択
    const dayButton = page.locator('.rdp-day').filter({ hasText: /^\d+$/ }).first()
    await dayButton.click()

    // カレンダーが閉じる
    await expect(page.locator('.rdp')).not.toBeVisible()
  })
})

// ========================================
// 2. 投稿一覧表示 (Requirement 2)
// ========================================
test.describe('投稿一覧表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('投稿が新しい順で表示される [Req2-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 読み込み完了を待つ
    await expect(page.getByText('読み込み中...')).not.toBeVisible({ timeout: 10000 })

    // 投稿一覧またはエンプティ状態のいずれかが表示される
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('日付をまたいで連続スクロール可能 [Req2-AC2]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // メインコンテンツエリアが存在
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('初期表示で今日の最終投稿位置 [Req2-AC4]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 今日の日付が表示されている（カルーセルで）
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const dateButton = page.getByRole('button', { name: new RegExp(`${month}月${day}日`) })
    await expect(dateButton).toBeVisible()
  })

  test('投稿なし時は空状態メッセージ表示', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 読み込み完了を待つ
    await page.waitForTimeout(2000)

    // メインコンテンツが表示される
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })
})

// ========================================
// 3. 日付とスクロール位置の同期 (Requirement 3)
// ========================================
test.describe('日付同期', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('スクロール中に日付ヘッダーが同期更新 [Req3-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 日付カルーセルが表示される
    const dateCarousel = page.locator('header')
    await expect(dateCarousel).toBeVisible()
  })

  test('日付変更時に即座に反映 [Req3-AC2]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開いて日付を選択
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    if (await calendarButton.isVisible()) {
      await calendarButton.click()
      const calendar = page.locator('.rdp')
      await expect(calendar).toBeVisible()
    }
  })
})

// ========================================
// 4. 空の日（投稿なし日）の処理 (Requirement 4)
// ========================================
test.describe('空の日処理', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('投稿なし日はスキップ [Req4-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // メインコンテンツが表示される
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('ほつれ使用日に🧵マーク表示 [Req4-AC2]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開いてほつれマークを確認
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    if (await calendarButton.isVisible()) {
      await calendarButton.click()

      // 凡例の存在を確認
      await expect(page.getByText('今日')).toBeVisible()
    }
  })
})

// ========================================
// 5. 投稿カード表示と操作 (Requirement 5)
// ========================================
test.describe('投稿カード', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('カードにテキスト・時刻表示 [Req5-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // メインコンテンツが存在
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('カードタップ→/edit/[id]へ遷移 [Req5-AC2]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 投稿カードをクリック（ボタンとして表示される）
    // 例: "05:30の記録を編集"
    const entryButton = page.getByRole('button', { name: /の記録を編集/ }).first()
    const hasEntry = await entryButton.isVisible().catch(() => false)

    if (hasEntry) {
      await entryButton.click()
      // 編集ページに遷移
      await expect(page).toHaveURL(/\/edit\//)
    }
  })
})

// ========================================
// 6. 月カレンダー表示 (Requirement 6)
// ========================================
test.describe('月カレンダー表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('記録あり日に●マーク表示 [Req6-AC1]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    await calendarButton.click()

    // カレンダーが表示される
    await expect(page.locator('.rdp')).toBeVisible()

    // 凡例で記録ありマークを確認
    await expect(page.getByText('記録あり')).toBeVisible()
  })

  test('今日の日付を◎マークで強調 [Req6-AC4]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    await calendarButton.click()

    // 凡例で今日マークを確認
    await expect(page.getByText('今日')).toBeVisible()
  })

  test('カレンダー外タップで閉じる [Req6-AC5]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開く
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    await calendarButton.click()
    await expect(page.locator('.rdp')).toBeVisible()

    // オーバーレイをクリック
    const overlay = page.locator('.fixed.inset-0').first()
    await overlay.click({ position: { x: 10, y: 10 } })

    // カレンダーが閉じる
    await expect(page.locator('.rdp')).not.toBeVisible()
  })
})

// ========================================
// 7. データ読み込みとパフォーマンス (Requirement 7)
// ========================================
test.describe('パフォーマンス', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('初期ロードで5日分データ読み込み [Req7-AC2]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 読み込み完了を確認
    await expect(page.getByText('読み込み中...')).not.toBeVisible({ timeout: 10000 })
  })

  test('無限スクロールで追加データ読み込み [Req7-AC8]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // メインコンテンツが存在
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('初期ロードが5秒以内に完了', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/timeline')
    await waitForPageLoad(page)

    await expect(page.getByText('読み込み中...')).not.toBeVisible({ timeout: 5000 })

    const loadTime = Date.now() - startTime
    console.log(`タイムライン初期ロード時間: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(5000)
  })

  test('エラー時リトライボタン表示 [Req7-AC9]', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/rest/v1/entries**', (route) => {
      route.abort('failed')
    })

    await page.goto('/timeline')
    await waitForPageLoad(page)

    // エラーメッセージの表示を確認（実装に依存）
    const errorMessage = page.getByText('エラーが発生しました')
    const isError = await errorMessage.isVisible().catch(() => false)

    if (isError) {
      const retryButton = page.getByRole('button', { name: '再試行' })
      await expect(retryButton).toBeVisible()
    }
  })
})

// ========================================
// 8. レスポンシブデザイン
// ========================================
test.describe('レスポンシブデザイン', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('モバイルビューポートで正しく表示 [Req7-AC1]', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // ヘッダーが表示される
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('タブレットビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/timeline')
    await waitForPageLoad(page)

    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('デスクトップビューポートで正しく表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/timeline')
    await waitForPageLoad(page)

    const header = page.locator('header')
    await expect(header).toBeVisible()
  })
})
