import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USER, waitForPageLoad } from './fixtures/test-helpers'

/**
 * SEOのE2Eテスト
 * PR #36 検証チェックリスト対象項目:
 * - 6.1.1: 編集ページnoindex → robots: noindexが設定
 * - 6.1.2: OGP画像 → og:imageが正しく設定
 * - 6.1.3: 外部リンク → rel="external noopener noreferrer"
 */

// ========================================
// 6.1 メタデータ
// ========================================
test.describe('メタデータ', () => {
  test.describe('6.1.1: /edit/[id]ページにrobots: noindexが設定されている', () => {
    test.skip(
      () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
      '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
    )

    test.beforeEach(async ({ page }) => {
      await setupTestSession(page, TEST_USER.id)
    })

    test('編集ページにnoindexメタタグがある', async ({ page }) => {
      // まずタイムラインで投稿を作成または既存の投稿を取得
      await page.goto('/timeline')
      await waitForPageLoad(page)

      // 編集可能なエントリを探す（24時間以内の投稿）
      const editButton = page.locator('button[aria-label*="編集"], a[href*="/edit/"]').first()
      const hasEditableEntry = await editButton.isVisible().catch(() => false)

      if (hasEditableEntry) {
        // 編集ページに遷移
        await editButton.click()
        await waitForPageLoad(page)

        // URLが/edit/で始まることを確認
        await expect(page).toHaveURL(/\/edit\//)

        // robots メタタグを確認
        const robotsMeta = page.locator('meta[name="robots"]')
        const robotsContent = await robotsMeta.getAttribute('content')

        // noindexが含まれていることを確認
        expect(robotsContent).toMatch(/noindex/)
      } else {
        // 編集可能な投稿がない場合はスキップ
        test.skip()
      }
    })

    test('編集ページのメタデータにindex: falseが設定されている', async ({ page }) => {
      // ダミーIDで編集ページにアクセス（404になる可能性があるが、メタタグは確認可能）
      // 実際のエントリIDがないとアクセスできないため、APIレスポンスをモック

      // テスト用のエントリを作成
      await page.goto('/timeline')
      await waitForPageLoad(page)

      const textarea = page.locator('textarea[aria-label="記録内容"]')
      const isVisible = await textarea.isVisible().catch(() => false)

      if (!isVisible) {
        test.skip()
        return
      }

      // テスト用の投稿を作成
      await textarea.fill('SEOテスト用投稿 ' + Date.now())
      const submitButton = page.locator('button[type="submit"]:has-text("記録する")')
      await submitButton.click()

      // 投稿完了を待つ
      await page.waitForTimeout(2000)
      await page.reload()
      await waitForPageLoad(page)

      // 最新の投稿の編集ボタンをクリック
      const editLink = page.locator('a[href*="/edit/"]').first()
      const hasEditLink = await editLink.isVisible().catch(() => false)

      if (hasEditLink) {
        await editLink.click()
        await waitForPageLoad(page)

        // robots メタタグを確認
        const robotsMeta = page.locator('meta[name="robots"]')
        const robotsContent = await robotsMeta.getAttribute('content')

        expect(robotsContent).toMatch(/noindex/)
      }
    })
  })

  test.describe('6.1.2: LPページにog:imageが正しく設定されている', () => {
    test('LPページにog:imageメタタグがある', async ({ page }) => {
      await page.goto('/lp')
      await waitForPageLoad(page)

      // og:imageメタタグを確認
      const ogImage = page.locator('meta[property="og:image"]')
      const ogImageContent = await ogImage.getAttribute('content')

      // og:imageが設定されていることを確認
      expect(ogImageContent).toBeTruthy()
      expect(ogImageContent).toMatch(/og-image/)
    })

    test('LPページのog:imageに正しいサイズが設定されている', async ({ page }) => {
      await page.goto('/lp')
      await waitForPageLoad(page)

      // og:image:widthを確認
      const ogWidth = page.locator('meta[property="og:image:width"]')
      const widthContent = await ogWidth.getAttribute('content')
      expect(widthContent).toBe('1200')

      // og:image:heightを確認
      const ogHeight = page.locator('meta[property="og:image:height"]')
      const heightContent = await ogHeight.getAttribute('content')
      expect(heightContent).toBe('630')
    })

    test('LPページのog:image:altが設定されている', async ({ page }) => {
      await page.goto('/lp')
      await waitForPageLoad(page)

      // og:image:altを確認
      const ogAlt = page.locator('meta[property="og:image:alt"]')
      const altContent = await ogAlt.getAttribute('content')

      expect(altContent).toBeTruthy()
      expect(altContent).toMatch(/ヒビオル/)
    })

    test('LPページのog:typeが設定されている', async ({ page }) => {
      await page.goto('/lp')
      await waitForPageLoad(page)

      // og:typeを確認
      const ogType = page.locator('meta[property="og:type"]')
      const typeContent = await ogType.getAttribute('content')

      expect(typeContent).toBe('website')
    })

    test('LPページのog:titleとog:descriptionが設定されている', async ({ page }) => {
      await page.goto('/lp')
      await waitForPageLoad(page)

      // og:titleを確認
      const ogTitle = page.locator('meta[property="og:title"]')
      const titleContent = await ogTitle.getAttribute('content')
      expect(titleContent).toBeTruthy()
      expect(titleContent).toMatch(/ヒビオル/)

      // og:descriptionを確認
      const ogDescription = page.locator('meta[property="og:description"]')
      const descContent = await ogDescription.getAttribute('content')
      expect(descContent).toBeTruthy()
    })

    test('LPページのTwitterカードが設定されている', async ({ page }) => {
      await page.goto('/lp')
      await waitForPageLoad(page)

      // twitter:cardを確認
      const twitterCard = page.locator('meta[name="twitter:card"]')
      const cardContent = await twitterCard.getAttribute('content')
      expect(cardContent).toBe('summary_large_image')

      // twitter:titleを確認
      const twitterTitle = page.locator('meta[name="twitter:title"]')
      const twitterTitleContent = await twitterTitle.getAttribute('content')
      expect(twitterTitleContent).toBeTruthy()
    })
  })

  test.describe('6.1.3: 外部リンクにrel="external noopener noreferrer"が設定されている', () => {
    test('ログインページの利用規約・プライバシーリンク', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)

      // 利用規約リンクを確認
      const termsLink = page.locator('a[href="/docs/terms"]')
      const termsLinkVisible = await termsLink.isVisible().catch(() => false)

      if (termsLinkVisible) {
        const termsRel = await termsLink.getAttribute('rel')
        expect(termsRel).toMatch(/noopener/)
        expect(termsRel).toMatch(/noreferrer/)
        // 外部リンクとして扱われる場合はexternalも含む
        expect(termsRel).toMatch(/external/)
      }

      // プライバシーポリシーリンクを確認
      const privacyLink = page.locator('a[href="/docs/privacy"]')
      const privacyLinkVisible = await privacyLink.isVisible().catch(() => false)

      if (privacyLinkVisible) {
        const privacyRel = await privacyLink.getAttribute('rel')
        expect(privacyRel).toMatch(/noopener/)
        expect(privacyRel).toMatch(/noreferrer/)
        expect(privacyRel).toMatch(/external/)
      }
    })

    test.describe('認証済みページの外部リンク', () => {
      test.skip(
        () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
        '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
      )

      test.beforeEach(async ({ page }) => {
        await setupTestSession(page, TEST_USER.id)
      })

      test('設定ページの法的リンクにrel属性が設定されている', async ({ page }) => {
        await page.goto('/social')
        await waitForPageLoad(page)

        // 設定タブに移動
        const settingsTab = page.getByRole('tab', { name: /設定/i })
        if (await settingsTab.isVisible()) {
          await settingsTab.click()
          await page.waitForTimeout(500)
        }

        // 利用規約リンクを確認
        const termsLink = page.locator('a[href="/docs/terms"]')
        const termsLinkVisible = await termsLink.isVisible().catch(() => false)

        if (termsLinkVisible) {
          const termsRel = await termsLink.getAttribute('rel')
          // noopenerとnoreferrerが含まれていることを確認
          expect(termsRel).toMatch(/noopener/)
          expect(termsRel).toMatch(/noreferrer/)
        }

        // プライバシーポリシーリンクを確認
        const privacyLink = page.locator('a[href="/docs/privacy"]')
        const privacyLinkVisible = await privacyLink.isVisible().catch(() => false)

        if (privacyLinkVisible) {
          const privacyRel = await privacyLink.getAttribute('rel')
          expect(privacyRel).toMatch(/noopener/)
          expect(privacyRel).toMatch(/noreferrer/)
        }
      })

      test('外部リンクにtarget="_blank"が設定されている', async ({ page }) => {
        await page.goto('/social')
        await waitForPageLoad(page)

        // 設定タブに移動
        const settingsTab = page.getByRole('tab', { name: /設定/i })
        if (await settingsTab.isVisible()) {
          await settingsTab.click()
          await page.waitForTimeout(500)
        }

        // 法的リンクにtarget="_blank"が設定されていることを確認
        const externalLinks = page.locator('a[target="_blank"]')
        const count = await externalLinks.count()

        // 少なくとも法的リンク（利用規約、プライバシーポリシー）が存在
        if (count > 0) {
          // target="_blank"のリンクにはrel属性が必須
          for (let i = 0; i < Math.min(count, 5); i++) {
            const link = externalLinks.nth(i)
            const rel = await link.getAttribute('rel')

            // セキュリティのためnoopener or noreferrerが必須
            expect(rel).toBeTruthy()
            expect(rel).toMatch(/noopener|noreferrer/)
          }
        }
      })
    })
  })
})

// ========================================
// 追加のSEOチェック
// ========================================
test.describe('追加のSEOチェック', () => {
  test('LPページにtitleタグがある', async ({ page }) => {
    await page.goto('/lp')
    await waitForPageLoad(page)

    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title).toMatch(/ヒビオル/)
  })

  test('LPページにdescriptionメタタグがある', async ({ page }) => {
    await page.goto('/lp')
    await waitForPageLoad(page)

    const description = page.locator('meta[name="description"]')
    const content = await description.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content?.length).toBeGreaterThan(50)
  })

  test('LPページにkeywordsメタタグがある', async ({ page }) => {
    await page.goto('/lp')
    await waitForPageLoad(page)

    const keywords = page.locator('meta[name="keywords"]')
    const content = await keywords.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content).toMatch(/ヒビオル|ADHD|記録/)
  })

  test('ログインページに適切なtitleがある', async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)

    const title = await page.title()
    expect(title).toBeTruthy()
  })
})
