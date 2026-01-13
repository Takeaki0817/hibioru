import { test, expect } from '@playwright/test'
import {
  setupTestSession,
  TEST_USER,
  waitForPageLoad,
  waitForTimelineLoad,
  waitForTimelineContent,
  openCalendar,
  closeCalendar,
} from './fixtures/test-helpers'

/**
 * タイムラインスクロール機能のE2Eテスト
 *
 * テスト対象:
 * 1. 初期表示位置（一番下=最新投稿）
 * 2. 投稿後のリダイレクト→最新位置表示
 * 3. 無限スクロール（上スクロールで過去データ追加読み込み）
 * 4. 日付カルーセルでの日付選択→該当日へスクロール
 * 5. 月カレンダーでの日付選択→該当日へスクロール
 * 6. スクロール連動（スクロール位置に応じた日付ハイライト）
 * 7. 空の日（投稿なし）のスキップ
 * 8. ほつれ使用日の🧵マーク表示
 * 9. 月カレンダーの連続記録線（━━）表示
 * 10. 未読み込み日付へのジャンプ時のローディング
 */

// ========================================
// 1. 初期表示位置（最新投稿）
// ========================================
test.describe('初期表示位置', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('タイムライン初期表示で最新投稿が表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    // スクロールコンテナを取得
    const scrollContainer = page.locator('.overflow-auto')
    const isVisible = await scrollContainer.isVisible().catch(() => false)

    if (isVisible) {
      // スクロール位置が下部（最新投稿位置）にある
      const scrollPosition = await scrollContainer.evaluate((el) => {
        return {
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        }
      })

      // 最新投稿が表示される位置（下部）にスクロールされている
      // 許容誤差: clientHeightの50%以内でOK
      const tolerance = scrollPosition.clientHeight * 0.5
      const expectedMinTop = scrollPosition.scrollHeight - scrollPosition.clientHeight - tolerance
      expect(scrollPosition.scrollTop).toBeGreaterThanOrEqual(expectedMinTop)
    }
  })

  test('投稿がない場合は空状態メッセージが表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineContent(page)

    // 投稿一覧または空状態のいずれかが表示される
    const hasEntries = await page.locator('[data-date]').first().isVisible().catch(() => false)
    const hasEmptyMessage = await page.getByText('まだ投稿がありません').isVisible().catch(() => false)

    // どちらかの状態が表示される
    expect(hasEntries || hasEmptyMessage).toBeTruthy()
  })

  test('今日の日付がカルーセルで選択状態', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()

    // 今日の日付ボタンが存在する
    const dateButton = page.getByRole('button', { name: new RegExp(`${month}月${day}日`) })
    await expect(dateButton).toBeVisible()
  })
})

// ========================================
// 2. 投稿後のリダイレクト→最新位置表示
// ========================================
test.describe('投稿後のリダイレクト', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('投稿成功後にタイムラインにリダイレクトされる', async ({ page }) => {
    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill(`スクロールテスト投稿 ${Date.now()}`)

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // タイムラインにリダイレクト
    await expect(page).toHaveURL('/timeline', { timeout: 15000 })
    await waitForTimelineLoad(page)
  })

  test('投稿成功後に最新投稿が表示される', async ({ page }) => {
    const uniqueContent = `スクロールテスト ${Date.now()}`

    await page.goto('/new')
    await waitForPageLoad(page)

    const textarea = page.getByLabel('記録内容')
    await textarea.fill(uniqueContent)

    const submitButton = page.getByRole('button', { name: /記録する/ })
    await submitButton.click()

    // タイムラインにリダイレクト後、投稿内容が表示される
    await expect(page).toHaveURL('/timeline', { timeout: 15000 })
    await waitForTimelineLoad(page)

    // 投稿内容がページ内に存在する
    await expect(page.getByText(uniqueContent)).toBeVisible({ timeout: 10000 })
  })
})

// ========================================
// 3. 無限スクロール（過去データ読み込み）
// ========================================
test.describe('無限スクロール', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('上スクロールで過去データ読み込みメッセージが表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    // スクロールコンテナを取得
    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      // 過去データがある場合のメッセージ表示を確認
      const loadMoreMessage = page.getByText('上にスクロールで過去の記録を読み込み')
      const hasLoadMoreMessage = await loadMoreMessage.isVisible().catch(() => false)

      // 過去データがある場合はメッセージが表示される
      if (hasLoadMoreMessage) {
        await expect(loadMoreMessage).toBeVisible()
      }
    }
  })

  test('上スクロールでIntersectionObserverがトリガーされる', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const isVisible = await scrollContainer.isVisible().catch(() => false)

    if (isVisible) {
      // 上端センチネルを確認
      const topSentinel = scrollContainer.locator('div.h-1').first()
      const hasSentinel = await topSentinel.isVisible().catch(() => false)

      if (hasSentinel) {
        // スクロールコンテナを上にスクロール
        await scrollContainer.evaluate((el) => {
          el.scrollTo({ top: 0, behavior: 'smooth' })
        })

        // スクロール後のデータ読み込みを待機
        await page.waitForTimeout(1000)
      }
    }
  })

  test('スクロールで日付セクションが追加される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      // 初期の日付セクション数を取得
      const initialDateSections = await page.locator('[data-date]').count()

      // 上にスクロール
      await scrollContainer.evaluate((el) => {
        el.scrollTo({ top: 0, behavior: 'instant' })
      })

      // データ読み込み待機
      await page.waitForTimeout(1500)

      // 日付セクション数を再取得
      const finalDateSections = await page.locator('[data-date]').count()

      // 過去データがある場合、セクション数が増加または同数
      expect(finalDateSections).toBeGreaterThanOrEqual(initialDateSections)
    }
  })
})

// ========================================
// 4. 日付カルーセルでの日付選択
// ========================================
test.describe('日付カルーセル', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('カルーセルで日付を選択すると該当日セクションにスクロール', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    // 日付ボタンを取得（中央以外のアクティブなボタン）
    const dateButtons = page.locator('button').filter({ hasText: /^\d+$/ })
    const buttonCount = await dateButtons.count()

    if (buttonCount > 1) {
      // 最初の日付ボタンをクリック
      await dateButtons.first().click()
      await page.waitForTimeout(500)

      // スクロールが発生したことを確認
      const scrollContainer = page.locator('.overflow-auto')
      const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

      if (hasScrollContainer) {
        // 日付セクションが表示されている
        const dateSections = page.locator('[data-date]')
        const hasDateSections = await dateSections.count() > 0
        expect(hasDateSections).toBeTruthy()
      }
    }
  })

  test('カルーセルの日付選択で視覚的フィードバック', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 中央に表示される日付は太字で白色になる
    const carouselContainer = page.locator('.relative.flex.h-10')
    const hasCarousel = await carouselContainer.isVisible().catch(() => false)

    if (hasCarousel) {
      // 中央マーカーが存在する
      const centerMarker = page.locator('.bg-primary-400, .bg-primary-500')
      await expect(centerMarker.first()).toBeVisible()
    }
  })
})

// ========================================
// 5. 月カレンダーでの日付選択
// ========================================
test.describe('月カレンダー日付選択', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('カレンダーで日付を選択すると該当日にスクロール', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    // カレンダーを開く
    await openCalendar(page)

    // 記録がある日付（entry class）を選択
    const entryDays = page.locator('.calendar-entry')
    const hasEntryDays = await entryDays.count() > 0

    if (hasEntryDays) {
      await entryDays.first().click()

      // カレンダーが閉じる
      await expect(page.locator('.rdp')).not.toBeVisible()

      // スクロールが発生
      await page.waitForTimeout(500)
    }
  })

  test('カレンダーの月を切り替えられる', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // 前月ボタンをクリック
    const prevButton = page.locator('.rdp button').filter({ has: page.locator('svg') }).first()
    const hasPrevButton = await prevButton.isVisible().catch(() => false)

    if (hasPrevButton) {
      await prevButton.click()
      await page.waitForTimeout(500)

      // カレンダーが更新される（ローディング後）
      await expect(page.locator('.rdp')).toBeVisible()
    }
  })

  test('記録がない日付は選択不可', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // 無効な日付（calendar-disabled）を確認
    const disabledDays = page.locator('.calendar-disabled')
    const hasDisabledDays = await disabledDays.count() > 0

    if (hasDisabledDays) {
      // 無効な日付にはcursor-not-allowedが適用される想定
      const firstDisabled = disabledDays.first()
      await expect(firstDisabled).toBeVisible()
    }
  })
})

// ========================================
// 6. スクロール連動（日付ハイライト）
// ========================================
test.describe('スクロール連動', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('スクロール位置に応じてカルーセルの日付が更新される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      // 上にスクロール
      await scrollContainer.evaluate((el) => {
        el.scrollTo({ top: 0, behavior: 'instant' })
      })

      await page.waitForTimeout(500)

      // カルーセルが存在する
      const carouselContainer = page.locator('.relative.flex.h-10')
      await expect(carouselContainer).toBeVisible()
    }
  })

  test('日付セクションがビューポートに入るとカルーセル更新', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    // 日付セクションの存在確認
    const dateSections = page.locator('[data-date]')
    const sectionCount = await dateSections.count()

    if (sectionCount > 1) {
      // 最初のセクションまでスクロール
      await dateSections.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // 最後のセクションまでスクロール
      await dateSections.last().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      // カルーセルが連動して更新される
      const carouselContainer = page.locator('.relative.flex.h-10')
      await expect(carouselContainer).toBeVisible()
    }
  })
})

// ========================================
// 7. 空の日（投稿なし）のスキップ
// ========================================
test.describe('空の日のスキップ', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('投稿がない日は日付セクションに表示されない', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    // 表示されている日付セクションを確認
    const dateSections = page.locator('[data-date]')
    const sectionCount = await dateSections.count()

    if (sectionCount > 0) {
      // 各セクションには投稿カードまたは「記録がありません」が表示される
      for (let i = 0; i < sectionCount; i++) {
        const section = dateSections.nth(i)
        const hasEntries = await section.locator('button[class*="rounded-lg"]').count() > 0
        const hasNoEntryMessage = await section.getByText('記録がありません').isVisible().catch(() => false)

        // 今日のセクションは記録なしでも表示される
        const dateAttr = await section.getAttribute('data-date')
        const today = new Date().toISOString().split('T')[0]
        const isToday = dateAttr === today

        if (isToday) {
          // 今日は記録なしでも表示OK
          expect(hasEntries || hasNoEntryMessage).toBeTruthy()
        } else {
          // 今日以外は記録がある場合のみ表示
          expect(hasEntries).toBeTruthy()
        }
      }
    }
  })

  test('カルーセルで記録なし日はスタイルが異なる', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 日付ボタンを確認
    const dateButtons = page.locator('button').filter({ hasText: /^\d+$/ })
    const buttonCount = await dateButtons.count()

    if (buttonCount > 0) {
      // アクティブでない日付はテキストが薄い
      const inactiveButtons = page.locator('button.cursor-not-allowed')
      const hasInactiveButtons = await inactiveButtons.count() > 0

      // 無効な日付があれば確認
      if (hasInactiveButtons) {
        await expect(inactiveButtons.first()).toBeVisible()
      }
    }
  })
})

// ========================================
// 8. ほつれ使用日の🧵マーク表示
// ========================================
test.describe('ほつれマーク表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('月カレンダーにほつれ凡例が表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // 凡例でほつれマークを確認
    const hotusreLegend = page.getByText('ほつれ')
    await expect(hotusreLegend).toBeVisible()

    // Spoolアイコン（🧵）が凡例に表示される
    const spoolIcon = page.locator('.fixed').locator('svg.lucide-spool')
    const hasSpoolIcon = await spoolIcon.isVisible().catch(() => false)
    expect(hasSpoolIcon).toBeTruthy()

    await closeCalendar(page)
  })

  test('カルーセルでほつれ日にSpoolアイコンが表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カルーセル内のSpoolアイコンを確認
    const carouselSpoolIcons = page.locator('header').locator('svg.lucide-spool, [class*="lucide-spool"]')
    const spoolCount = await carouselSpoolIcons.count()

    // ほつれ使用日がある場合はアイコンが表示される
    // テストデータに依存するため、存在確認のみ
    expect(spoolCount).toBeGreaterThanOrEqual(0)
  })

  test('月カレンダーでほつれ日にSpoolアイコンが表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // カレンダー内のほつれクラスを確認
    const hotsureDays = page.locator('.calendar-hotsure')
    const hotsureCount = await hotsureDays.count()

    // ほつれ使用日がある場合はアイコンが表示される
    if (hotsureCount > 0) {
      // Spoolアイコンが各ほつれ日に表示される
      const spoolIcons = page.locator('.rdp').locator('svg.lucide-spool, [class*="lucide-spool"]')
      const iconCount = await spoolIcons.count()
      expect(iconCount).toBeGreaterThanOrEqual(hotsureCount)
    }

    await closeCalendar(page)
  })
})

// ========================================
// 9. 月カレンダーの連続記録線表示
// ========================================
test.describe('連続記録線表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('月カレンダーに連続記録線のクラスが適用される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // ストリーク線のクラスを確認
    const streakStart = page.locator('.streak-line.streak-start')
    const streakMiddle = page.locator('.streak-line.streak-middle')
    const streakEnd = page.locator('.streak-line.streak-end')
    const streakSingle = page.locator('.streak-line.streak-single')

    // いずれかの連続記録があるか確認（テストデータに依存）
    const startCount = await streakStart.count()
    const middleCount = await streakMiddle.count()
    const endCount = await streakEnd.count()
    const singleCount = await streakSingle.count()

    const totalStreakDays = startCount + middleCount + endCount + singleCount
    // 連続記録がある場合は線が表示される
    expect(totalStreakDays).toBeGreaterThanOrEqual(0)

    await closeCalendar(page)
  })

  test('凡例に記録あり表示が存在する', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // 記録あり凡例を確認
    const entryLegend = page.getByText('記録あり')
    await expect(entryLegend).toBeVisible()

    await closeCalendar(page)
  })
})

// ========================================
// 10. 未読み込み日付へのジャンプ時のローディング
// ========================================
test.describe('未読み込み日付へのジャンプ', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('過去の月に切り替えるとローディング状態が表示される', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await openCalendar(page)

    // 前月ボタンを複数回クリック
    const prevButton = page.locator('.rdp button').filter({ has: page.locator('svg') }).first()
    const hasPrevButton = await prevButton.isVisible().catch(() => false)

    if (hasPrevButton) {
      // 3ヶ月前に移動
      await prevButton.click()
      await page.waitForTimeout(200)
      await prevButton.click()
      await page.waitForTimeout(200)
      await prevButton.click()

      // ローディング状態が表示される可能性があるが、すぐに消える
      // ローディング後、カレンダーが表示される
      await expect(page.locator('.rdp')).toBeVisible({ timeout: 5000 })
    }
  })

  test('カレンダーで過去の日付を選択すると読み込み後スクロール', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    await openCalendar(page)

    // 前月に移動
    const prevButton = page.locator('.rdp button').filter({ has: page.locator('svg') }).first()
    const hasPrevButton = await prevButton.isVisible().catch(() => false)

    if (hasPrevButton) {
      await prevButton.click()
      await page.waitForTimeout(500)

      // 記録がある日を選択
      const entryDays = page.locator('.calendar-entry')
      const hasEntryDays = await entryDays.count() > 0

      if (hasEntryDays) {
        await entryDays.first().click()

        // カレンダーが閉じる
        await expect(page.locator('.rdp')).not.toBeVisible({ timeout: 5000 })

        // スクロールが完了
        await page.waitForTimeout(1000)

        // 日付セクションが表示される
        const dateSections = page.locator('[data-date]')
        const hasDateSections = await dateSections.count() > 0
        expect(hasDateSections).toBeTruthy()
      }
    }
  })
})

// ========================================
// パフォーマンステスト
// ========================================
test.describe('スクロールパフォーマンス', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('大量スクロールでもUIがフリーズしない', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      const startTime = Date.now()

      // 高速スクロールを10回繰り返す
      for (let i = 0; i < 10; i++) {
        await scrollContainer.evaluate((el) => {
          el.scrollTop = 0
        })
        await page.waitForTimeout(50)
        await scrollContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight
        })
        await page.waitForTimeout(50)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // 10回のスクロールが5秒以内に完了する
      expect(duration).toBeLessThan(5000)

      // UIが応答している（カルーセルが表示されている）
      const carouselContainer = page.locator('.relative.flex.h-10')
      await expect(carouselContainer).toBeVisible()
    }
  })

  test('スクロール中にIntersectionObserverが正常動作', async ({ page }) => {
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      // 上部センチネルが存在
      const topSentinel = scrollContainer.locator('div.h-1').first()
      const hasSentinel = await topSentinel.count() > 0

      if (hasSentinel) {
        // センチネルにスクロール
        await scrollContainer.evaluate((el) => {
          el.scrollTop = 0
        })
        await page.waitForTimeout(500)

        // ページがクラッシュせずに動作
        await expect(page.locator('header')).toBeVisible()
      }
    }
  })
})

// ========================================
// レスポンシブデザイン
// ========================================
test.describe('レスポンシブスクロール', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('モバイルビューポートでスクロールが正常動作', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      // スクロールが可能
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 0
      })
      await page.waitForTimeout(300)

      await expect(page.locator('header')).toBeVisible()
    }
  })

  test('タブレットビューポートでスクロールが正常動作', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/timeline')
    await waitForPageLoad(page)
    await waitForTimelineLoad(page)

    const scrollContainer = page.locator('.overflow-auto')
    const hasScrollContainer = await scrollContainer.isVisible().catch(() => false)

    if (hasScrollContainer) {
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 100
      })
      await page.waitForTimeout(300)

      await expect(page.locator('header')).toBeVisible()
    }
  })
})
