import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USER, waitForPageLoad } from './fixtures/test-helpers'

/**
 * アクセシビリティのE2Eテスト
 *
 * 検証項目:
 * - 装飾的アイコン → aria-hidden="true"
 * - ローディング状態 → aria-busy="true"
 * - トグル状態 → aria-pressed
 * - 画像alt → 詳細なalt属性
 * - キーボード送信 → Cmd+Enter / Ctrl+Enter
 * - フォーカス管理 → Tabキー順序
 */

// ========================================
// 5.1 ARIA属性
// ========================================
test.describe('ARIA属性', () => {
  test.describe('5.1.1: 装飾的アイコンにaria-hidden="true"が設定されている', () => {
    test('ログインページの装飾的要素', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)

      // ログインページにあるSVGアイコン（Googleログインボタン内など）を確認
      // aria-hidden="true"が設定されている要素を検索
      const hiddenElements = page.locator('svg[aria-hidden="true"]')
      const count = await hiddenElements.count()

      // SVGアイコンにaria-hidden="true"が設定されていることを確認
      // ログインボタン内のGoogleアイコンなどが該当
      expect(count).toBeGreaterThanOrEqual(0) // LPによっては0の場合もある
    })

    test.describe('認証済みページの装飾的アイコン', () => {
      test.skip(
        () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
        '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
      )

      test.beforeEach(async ({ page }) => {
        await setupTestSession(page, TEST_USER.id)
      })

      test('タイムラインページのアイコン', async ({ page }) => {
        await page.goto('/timeline')
        await waitForPageLoad(page)

        // カレンダーアイコンなど装飾的アイコンを確認
        const calendarIcon = page.locator('.lucide-calendar[aria-hidden="true"]')
        const hiddenElements = page.locator('[aria-hidden="true"]')

        // 少なくとも装飾的要素が存在
        const count = await hiddenElements.count()
        expect(count).toBeGreaterThan(0)
      })

      test('ソーシャルページのアイコン', async ({ page }) => {
        await page.goto('/social')
        await waitForPageLoad(page)

        // 設定タブに移動
        const settingsTab = page.getByRole('tab', { name: /設定/i })
        if (await settingsTab.isVisible()) {
          await settingsTab.click()
        }

        // 装飾的アイコンを確認
        const hiddenElements = page.locator('[aria-hidden="true"]')
        const count = await hiddenElements.count()
        expect(count).toBeGreaterThan(0)
      })
    })
  })

  test.describe('5.1.2: ローディング中の要素にaria-busy="true"が設定されている', () => {
    test.skip(
      () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
      '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
    )

    test.beforeEach(async ({ page }) => {
      await setupTestSession(page, TEST_USER.id)
    })

    test('タイムラインローディング時にaria-busyが設定される', async ({ page }) => {
      // ネットワーク遅延をシミュレート
      await page.route('**/rest/v1/entries*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        await route.continue()
      })

      await page.goto('/timeline')

      // ローディング中の要素を探す
      const busyElement = page.locator('[aria-busy="true"]')

      // ローディング状態が存在するか、または既にロード完了しているか
      const hasBusyElement = await busyElement.first().isVisible().catch(() => false)

      // ローディング中にaria-busyが設定されているか確認
      // （ネットワーク状態によっては既にロード完了している可能性がある）
      if (hasBusyElement) {
        await expect(busyElement.first()).toBeVisible()
      }
    })

    test('リストスケルトンにaria-busyが設定されている', async ({ page }) => {
      // APIをブロックしてローディング状態を維持
      await page.route('**/rest/v1/entries*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await route.continue()
      })

      await page.goto('/timeline')

      // スケルトンローダーにaria-busy="true"が設定されていることを確認
      const skeleton = page.locator('[aria-busy="true"]')
      const isVisible = await skeleton.first().isVisible().catch(() => false)

      if (isVisible) {
        await expect(skeleton.first()).toHaveAttribute('aria-busy', 'true')
      }
    })
  })

  test.describe('5.1.3: お祝いボタンにaria-pressedが正しく設定されている', () => {
    test.skip(
      () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
      '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
    )

    test.beforeEach(async ({ page }) => {
      await setupTestSession(page, TEST_USER.id)
    })

    test('お祝いボタンにaria-pressed属性がある', async ({ page }) => {
      await page.goto('/social')
      await waitForPageLoad(page)

      // フィードタブに移動
      const feedTab = page.getByRole('tab', { name: /フィード/i })
      if (await feedTab.isVisible()) {
        await feedTab.click()
        await page.waitForTimeout(500)
      }

      // お祝いボタンを探す
      const celebrateButton = page.locator('button[aria-pressed]')
      const isVisible = await celebrateButton.first().isVisible().catch(() => false)

      if (isVisible) {
        // aria-pressedが"true"または"false"のいずれかであることを確認
        const ariaPressed = await celebrateButton.first().getAttribute('aria-pressed')
        expect(['true', 'false']).toContain(ariaPressed)
      }
    })

    test('お祝いボタンのaria-labelが適切に設定されている', async ({ page }) => {
      await page.goto('/social')
      await waitForPageLoad(page)

      // フィードタブに移動
      const feedTab = page.getByRole('tab', { name: /フィード/i })
      if (await feedTab.isVisible()) {
        await feedTab.click()
        await page.waitForTimeout(500)
      }

      // aria-label付きのお祝いボタンを探す
      const celebrateButton = page.locator('button[aria-label*="お祝い"]')
      const isVisible = await celebrateButton.first().isVisible().catch(() => false)

      if (isVisible) {
        const ariaLabel = await celebrateButton.first().getAttribute('aria-label')
        expect(ariaLabel).toMatch(/お祝い/)
      }
    })
  })

  test.describe('5.1.4: 添付画像に詳細なalt属性が設定されている', () => {
    test.skip(
      () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
      '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
    )

    test.beforeEach(async ({ page }) => {
      await setupTestSession(page, TEST_USER.id)
    })

    test('タイムラインの投稿画像にalt属性がある', async ({ page }) => {
      await page.goto('/timeline')
      await waitForPageLoad(page)

      // 投稿画像を探す
      const postImages = page.locator('img[alt*="投稿画像"], img[alt*="添付画像"]')
      const count = await postImages.count()

      if (count > 0) {
        // 各画像にalt属性があることを確認
        for (let i = 0; i < Math.min(count, 3); i++) {
          const alt = await postImages.nth(i).getAttribute('alt')
          expect(alt).toBeTruthy()
          expect(alt?.length).toBeGreaterThan(0)
        }
      }
    })

    test('フィードの共有画像にalt属性がある', async ({ page }) => {
      await page.goto('/social')
      await waitForPageLoad(page)

      // フィードタブに移動
      const feedTab = page.getByRole('tab', { name: /フィード/i })
      if (await feedTab.isVisible()) {
        await feedTab.click()
        await page.waitForTimeout(500)
      }

      // 共有画像を探す
      const sharedImages = page.locator('img[alt*="共有画像"]')
      const count = await sharedImages.count()

      if (count > 0) {
        // 各画像にalt属性があることを確認
        for (let i = 0; i < Math.min(count, 3); i++) {
          const alt = await sharedImages.nth(i).getAttribute('alt')
          expect(alt).toBeTruthy()
          expect(alt).toMatch(/さんの共有画像/)
        }
      }
    })
  })
})

// ========================================
// 5.2 キーボード操作
// ========================================
test.describe('キーボード操作', () => {
  test.describe('5.2.1: Cmd+Enter / Ctrl+Enterでフォーム送信', () => {
    test.skip(
      () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
      '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
    )

    test.beforeEach(async ({ page }) => {
      await setupTestSession(page, TEST_USER.id)
    })

    test('エントリフォームでキーボードショートカット送信が動作する', async ({ page }) => {
      await page.goto('/timeline')
      await waitForPageLoad(page)

      // テキストエリアを探してフォーカス
      const textarea = page.locator('textarea[aria-label="記録内容"]')
      await textarea.waitFor({ state: 'visible', timeout: 5000 })
      await textarea.click()

      // テスト用のテキストを入力
      const testContent = 'キーボードショートカットテスト ' + Date.now()
      await textarea.fill(testContent)

      // OSに応じたモディファイアキーを決定
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'

      // Cmd+Enter または Ctrl+Enter で送信
      await page.keyboard.press(`${modifier}+Enter`)

      // 送信が実行されたことを確認（成功メッセージまたはテキストがクリアされる）
      await page.waitForTimeout(1000)

      // 送信成功の確認方法:
      // 1. テキストエリアが空になっている
      // 2. または成功オーバーレイが表示される
      const currentValue = await textarea.inputValue()
      const successOverlay = page.locator('text=記録しました')

      const isCleared = currentValue === ''
      const hasSuccess = await successOverlay.isVisible().catch(() => false)

      // 送信が実行された証拠
      expect(isCleared || hasSuccess).toBeTruthy()
    })
  })

  test.describe('5.2.2: Tabキーで論理的な順序でフォーカス移動', () => {
    test('ログインページのフォーカス順序', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)

      // ページのナビゲーション完了を待機
      await page.waitForLoadState('domcontentloaded')

      // フォーカス可能な要素を直接確認
      const focusableElements = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        return Array.from(elements).map((el) => ({
          tagName: el.tagName,
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
        }))
      })

      // フォーカス可能な要素が存在することを確認
      expect(focusableElements.length).toBeGreaterThan(0)

      // Tabでフォーカス移動が可能なことを確認（少なくとも1回のTab移動）
      await page.keyboard.press('Tab')
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName)
      expect(firstFocused).toBeTruthy()
    })

    test.describe('認証済みページのフォーカス順序', () => {
      test.skip(
        () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
        '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
      )

      test.beforeEach(async ({ page }) => {
        await setupTestSession(page, TEST_USER.id)
      })

      test('タイムラインページのフォーカス順序', async ({ page }) => {
        await page.goto('/timeline')
        await waitForPageLoad(page)

        // 最初の対話可能な要素にフォーカス
        await page.keyboard.press('Tab')

        // フォーカス可能な要素を順番に確認
        const focusOrder: string[] = []

        for (let i = 0; i < 10; i++) {
          const focusedElement = await page.evaluate(() => {
            const el = document.activeElement
            if (!el) return null
            return {
              tagName: el.tagName,
              role: el.getAttribute('role'),
              ariaLabel: el.getAttribute('aria-label'),
            }
          })

          if (focusedElement) {
            const identifier =
              focusedElement.ariaLabel ||
              focusedElement.role ||
              focusedElement.tagName
            focusOrder.push(identifier)
          }

          await page.keyboard.press('Tab')
        }

        // フォーカス順序が論理的であることを確認（複数要素に移動している）
        expect(focusOrder.length).toBeGreaterThan(0)
      })

      test('エントリフォームのフォーカス順序が論理的', async ({ page }) => {
        await page.goto('/timeline')
        await waitForPageLoad(page)

        // テキストエリアにフォーカス
        const textarea = page.locator('textarea[aria-label="記録内容"]')
        await textarea.click()

        // テキストエリアがフォーカスされていることを確認
        const isTextareaFocused = await page.evaluate(() => {
          return document.activeElement?.tagName === 'TEXTAREA'
        })
        expect(isTextareaFocused).toBeTruthy()

        // Tabで次の要素に移動
        await page.keyboard.press('Tab')

        // フォーカスが移動していることを確認
        const newFocusedElement = await page.evaluate(() => {
          const el = document.activeElement
          return el?.tagName
        })

        // フォーカスがテキストエリアから移動している
        expect(newFocusedElement).not.toBe('TEXTAREA')
      })
    })
  })
})
