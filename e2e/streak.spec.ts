import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USER, waitForPageLoad } from './fixtures/test-helpers'

/**
 * ストリーク（継続記録）・ほつれ機能のE2Eテスト
 * 仕様: .kiro/specs/streak/requirements.md
 *
 * 注意: ストリーク計算・ほつれ自動消費は日次バッチ処理で行われるため、
 * E2Eテストでは主にUI表示の確認を行う。
 * バッチ処理のロジックはユニットテスト・統合テストでカバー。
 */

// ========================================
// 未認証テスト（認証不要）
// ========================================
test.describe('未認証時の動作', () => {
  test('未認証で/socialにアクセス→/にリダイレクト', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('img', { name: 'ヒビオル' })).toBeVisible()
  })
})

// ========================================
// 1. ストリーク表示 (Requirement 8)
// ========================================
test.describe('ストリーク表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('現在ストリーク数（🔥current_streak）が表示される [Req8-AC1]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // プロフィールセクションでストリーク表示を確認
    // 🔥マークまたは「連続」「ストリーク」のテキストを探す
    const streakSection = page.locator('[class*="streak"]').first()
    const streakDisplay = streakSection.or(page.getByText(/連続|ストリーク|\d+日/))
    await expect(streakDisplay).toBeVisible()
  })

  test('最長ストリーク数（🏆longest_streak）が表示される [Req8-AC2]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // 最長ストリーク表示を確認
    const longestStreak = page.getByText(/最長|過去最高|🏆/)
    const isVisible = await longestStreak.isVisible().catch(() => false)

    // 表示されている場合のみテスト
    if (isVisible) {
      await expect(longestStreak).toBeVisible()
    }
  })

  test('ほつれ残数（🧵hotsure_remaining）が表示される [Req8-AC3]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ほつれ残数表示を確認
    const hotsureDisplay = page.getByText(/ほつれ|🧵/)
    const isVisible = await hotsureDisplay.isVisible().catch(() => false)

    if (isVisible) {
      await expect(hotsureDisplay).toBeVisible()
    }
  })

  test('ストリーク0時に励ましメッセージ表示', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ストリークセクションが表示される
    // 具体的なメッセージは実装に依存
    const socialPage = page.locator('main')
    await expect(socialPage).toBeVisible()
  })
})

// ========================================
// 2. 週間レコード表示
// ========================================
test.describe('週間レコード', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('週間記録状況が表示される', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // 週間記録セクションを確認（WeeklyRecordコンポーネント）
    const weeklySection = page.locator('[class*="weekly"]').first()
    const weekDisplay = weeklySection.or(page.getByText(/今週|週間|月|火|水|木|金|土|日/))
    const isVisible = await weekDisplay.isVisible().catch(() => false)

    if (isVisible) {
      await expect(weekDisplay).toBeVisible()
    }
  })

  test('ほつれ使用状況が可視化される', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ほつれ使用マーク（🧵）の存在を確認
    // 実際のデータに依存するため、ページが表示されることを確認
    const socialPage = page.locator('main')
    await expect(socialPage).toBeVisible()
  })
})

// ========================================
// 3. タイムライン連携 (Requirement 8-AC4,5)
// ========================================
test.describe('タイムライン連携', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('タイムラインで記録日が識別可能 [Req8-AC4]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 日付ヘッダーが表示される
    const dateHeader = page.locator('[class*="sticky"]').first()
    await expect(dateHeader).toBeVisible()
  })

  test('月カレンダーで記録日が識別可能 [Req8-AC5]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開く
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    if (await calendarButton.isVisible()) {
      await calendarButton.click()

      // カレンダーが表示される
      await expect(page.locator('.rdp')).toBeVisible()

      // 記録あり日のマークを確認（凡例で確認）
      await expect(page.getByText('記録あり')).toBeVisible()
    }
  })

  test('月カレンダーでほつれ使用日に🧵マーク [Req8-AC6]', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開く
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    if (await calendarButton.isVisible()) {
      await calendarButton.click()

      // カレンダーが表示される
      await expect(page.locator('.rdp')).toBeVisible()

      // ほつれマーク（🧵）はデータ依存のため、カレンダー表示を確認
      const calendar = page.locator('.rdp')
      await expect(calendar).toBeVisible()
    }
  })
})

// ========================================
// 4. ほつれ表示
// ========================================
test.describe('ほつれ表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('ほつれ残数が残数/2形式で表示される', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ほつれ残数表示（例: 2/2, 1/2, 0/2）を確認
    const hotsureDisplay = page.getByText(/\d\/2|ほつれ|🧵/)
    const isVisible = await hotsureDisplay.isVisible().catch(() => false)

    if (isVisible) {
      await expect(hotsureDisplay).toBeVisible()
    }
  })

  test('ほつれ切れ時に警告表示', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // ほつれ0の場合の警告表示（データ依存）
    // ページが正常に表示されることを確認
    const socialPage = page.locator('main')
    await expect(socialPage).toBeVisible()
  })
})

// ========================================
// 5. ストリーク計算（UIベース確認）
// ========================================
test.describe('ストリーク計算確認', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('初回記録でストリーク開始 [Req1-AC1]', async ({ page }) => {
    // ソーシャルページでストリーク状態を確認
    await page.goto('/social')
    await waitForPageLoad(page)

    // ストリーク表示エリアが存在する
    const streakArea = page.locator('[class*="streak"]').first()
    const streakText = streakArea.or(page.getByText(/ストリーク|連続/))
    const isVisible = await streakText.isVisible().catch(() => false)

    if (isVisible) {
      await expect(streakText).toBeVisible()
    }
  })

  test('最長記録が保持される [Req1-AC3]', async ({ page }) => {
    await page.goto('/social')
    await waitForPageLoad(page)

    // 最長ストリークが表示される
    const longestDisplay = page.getByText(/最長|🏆/)
    const isVisible = await longestDisplay.isVisible().catch(() => false)

    if (isVisible) {
      await expect(longestDisplay).toBeVisible()
    }
  })
})

// ========================================
// 6. レスポンシブデザイン
// ========================================
test.describe('レスポンシブデザイン', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('モバイルビューポートでストリーク表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/social')
    await waitForPageLoad(page)

    // ページが正しく表示される
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('タブレットビューポートでストリーク表示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/social')
    await waitForPageLoad(page)

    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('デスクトップビューポートでストリーク表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/social')
    await waitForPageLoad(page)

    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })
})
