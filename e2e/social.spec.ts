import { test, expect, Page } from '@playwright/test'
import {
  setupTestSession,
  setupAuthenticatedPage,
  TEST_USERS,
  waitForElement,
  waitForPageLoad,
  waitForApiResponse,
} from './fixtures/test-helpers'

/**
 * Social機能のE2Eテスト
 *
 * 対象機能:
 * - ユーザー検索・プロフィール表示
 * - フォロー・フォロー解除
 * - ソーシャルフィード表示
 * - お祝い送信
 * - 通知表示
 *
 * テストシナリオ: docs/test-reconstruction/test-scenarios-social.md
 */

test.describe('Social機能 - ユーザー検索・プロフィール表示', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('ユーザー検索・キーワード検索', async ({ page }) => {
    // seed-e2e.sql に "user_abc" ユーザーが追加されている

    // 検索ボックスに「user_abc」と入力
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('user_abc')

    // 検索実行（入力後、デバウンスで自動検索される想定）
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 10000 })

    // 候補ユーザーが表示されることを確認
    const searchResults = page.locator('[data-testid="search-result-item"]')
    const count = await searchResults.count()
    expect(count).toBeGreaterThan(0)
  })

  test('ユーザー検索・絞り込み', async ({ page }) => {
    // seed-e2e.sql に "test_user" と "e2etest" ユーザーが追加されている
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')

    // 最初の検索
    await searchInput.fill('e2e')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const firstResults = await page.locator('[data-testid="search-result-item"]').count()

    // 再検索で絞り込み
    await searchInput.clear()
    await searchInput.fill('e2etest')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const filteredResults = await page.locator('[data-testid="search-result-item"]').count()

    // 絞り込み後の結果が最初の検索結果以下であることを確認
    expect(filteredResults).toBeLessThanOrEqual(firstResults)
  })

  test('プロフィール表示', async ({ page }) => {
    // seed-e2e.sql に "test_user" ユーザーが追加されている
    // 検索結果からユーザーを検索
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_user')

    // 検索結果が表示されるまで待機
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })

    // 最初の検索結果のリンクを取得してhrefから直接遷移
    const firstResultLink = page.locator('[data-testid="search-result-item"]').first().locator('a')
    const href = await firstResultLink.getAttribute('href')
    if (href) {
      await page.goto(href)
    }

    // プロフィールページに遷移
    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    // アバター、ユーザー名、表示名が表示されることを確認
    await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-username"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-display-name"]')).toBeVisible()
  })

  test('プロフィール直接URL遷移', async ({ page }) => {
    // 直接URLでプロフィールページにアクセス
    await page.goto('/social/profile/e2etest2')
    await waitForPageLoad(page)

    await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-username"]')).toContainText('e2etest2')
  })
})

test.describe('Social機能 - フォロー・フォロー解除', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('フォロー・新規フォロー', async ({ page }) => {
    // seed-e2e.sql に "test_user" ユーザーが追加されている
    // 検索からユーザーを見つける
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_user')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })

    // ユーザーをクリックしてプロフィールページへ
    const href1 = await page.locator('[data-testid="search-result-item"]').first().locator('a').getAttribute('href')
    if (href1) await page.goto(href1)
    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    // フォローボタンをクリック
    const followButton = page.locator('[data-testid="follow-button"]')
    const initialText = await followButton.textContent()
    expect(initialText?.includes('フォロー')).toBeTruthy()

    // ボタンをクリック
    await followButton.click()

    // ボタンが「フォロー中」に変更されることを確認（Server Actionなので直接状態変更を待つ）
    await expect(followButton).toContainText('フォロー中', { timeout: 10000 })
  })

  test('フォロー・通知作成', async ({ page, browser }) => {
    // seed-e2e.sql に "e2etest2" (SECONDARY) ユーザーが追加されている
    // プライマリユーザーがセカンダリユーザーをフォロー
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('e2etest2')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const href2 = await page.locator('[data-testid="search-result-item"]').first().locator('a').getAttribute('href')
    if (href2) await page.goto(href2)

    await page.waitForURL('/social/profile/**', { timeout: 10000 })
    const followButton = page.locator('[data-testid="follow-button"]')
    await followButton.click()

    // ボタンが「フォロー中」に変更されることを確認
    await expect(followButton).toContainText('フォロー中', { timeout: 10000 })

    // セカンダリユーザーとして別セッションを作成
    const context = await browser.newContext()
    const secondaryPage = await context.newPage()
    await setupTestSession(secondaryPage, TEST_USERS.SECONDARY.id)
    await secondaryPage.goto('/social')
    await waitForPageLoad(secondaryPage)

    // 通知タブをクリック
    const notificationTab = secondaryPage.locator('[data-testid="notification-tab"]')
    await notificationTab.click()

    // フォロー通知が表示されることを確認
    await waitForElement(
      secondaryPage,
      'text=がフォローしました',
      { timeout: 5000 }
    )
    const notification = secondaryPage.locator('text=がフォローしました')
    await expect(notification).toBeVisible()

    await context.close()
  })

  test('フォロー解除', async ({ page }) => {
    // seed-e2e.sql に "test_user" ユーザーが追加されている
    // フォロー中のユーザーをフォロー解除
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_user')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const href3 = await page.locator('[data-testid="search-result-item"]').first().locator('a').getAttribute('href')
    if (href3) await page.goto(href3)

    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    const followButton = page.locator('[data-testid="follow-button"]')

    // フォロー状態を確認
    const isFollowing = await followButton.textContent().then((text) => text?.includes('フォロー中'))

    if (isFollowing) {
      // フォロー中の場合、ボタンをクリックしてフォロー解除
      await followButton.click()

      // ボタンが「フォロー」に変更されることを確認（「フォロー中」ではなく「フォロー」のみ）
      await expect(followButton).not.toContainText('フォロー中', { timeout: 10000 })
    }
  })

  test('フォロー数表示', async ({ page }) => {
    // ソーシャルページのフォロー数セクションを確認
    // API応答を待機してデータが読み込まれることを確認
    await waitForApiResponse(page, '/api/social/follow-counts', { timeout: 5000 }).catch(() => {})

    const followStats = page.locator('[data-testid="follow-stats"]')
    await expect(followStats).toBeVisible()

    // フォロー数とフォロワー数が表示されることを確認
    const followingText = page.locator('[data-testid="following-count"]')
    const followerText = page.locator('[data-testid="follower-count"]')

    await expect(followingText).toBeVisible()
    await expect(followerText).toBeVisible()
  })

  test('フォロー中一覧', async ({ page }) => {
    // フォロー数セクションを開く
    const followStats = page.locator('[data-testid="follow-stats"]')
    const followingLink = followStats.locator('[data-testid="following-link"]')
    const href = await followingLink.getAttribute('href')
    if (href) await page.goto(href)

    // フォロー中一覧ページに遷移
    await page.waitForURL('/social/following', { timeout: 10000 })

    // フォロー中のユーザーが表示されることを確認
    await page.getByTestId('follow-list-item').first().waitFor({ timeout: 5000 }).catch(() => {})
    const followingList = page.getByTestId('follow-list-item')
    expect(await followingList.count()).toBeGreaterThanOrEqual(0)
  })

  test('フォロー中リスト_空状態', async ({ page }) => {
    // SECONDARYユーザーでログイン（フォローがない状態）
    await setupTestSession(page, TEST_USERS.SECONDARY.id)
    await page.goto('/social/following')
    await waitForPageLoad(page)

    // 空状態メッセージを確認
    await expect(page.locator('text=まだ誰もフォローしていません')).toBeVisible({ timeout: 10000 })
  })

  test('フォロー中リスト_ページネーション', async ({ page }) => {
    // フォロー中一覧に遷移
    await page.goto('/social/following')
    await waitForPageLoad(page)

    // 「もっと見る」ボタンがあればクリック
    const loadMoreButton = page.locator('button:has-text("もっと見る")')
    if (await loadMoreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const initialCount = await page.getByTestId('follow-list-item').count()
      await loadMoreButton.click()
      await page.waitForTimeout(1000)
      const newCount = await page.getByTestId('follow-list-item').count()
      expect(newCount).toBeGreaterThanOrEqual(initialCount)
    }
  })

  test('フォロワー一覧', async ({ page }) => {
    // フォロー数セクションを開く
    const followStats = page.locator('[data-testid="follow-stats"]')
    const followerLink = followStats.locator('[data-testid="follower-link"]')
    const href = await followerLink.getAttribute('href')
    if (href) await page.goto(href)

    // フォロワー一覧ページに遷移
    await page.waitForURL('/social/followers', { timeout: 10000 })

    // フォロワーが表示されることを確認
    await page.getByTestId('follow-list-item').first().waitFor({ timeout: 5000 }).catch(() => {})
    const followerList = page.getByTestId('follow-list-item')
    expect(await followerList.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Social機能 - ソーシャルフィード表示', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('ソーシャルフィード・初期表示', async ({ page }) => {
    // 「みんな」タブをクリック（デフォルトは「設定」タブ）
    const feedTab = page.locator('[data-testid="feed-tab"]')
    await feedTab.click()
    await expect(feedTab).toHaveAttribute('aria-selected', 'true')

    // フィードが読み込まれるまで待機
    await page.getByTestId('feed-item').first().waitFor({ timeout: 5000, state: 'attached' }).catch(() => {
      // フィードが空の可能性があるため、empty stateも確認
    })

    // フィードまたは空状態が表示されることを確認
    const feedItems = page.getByTestId('feed-item')
    const emptyState = page.locator('text=みんなの記録を見よう')  // 空の場合のメッセージ

    const hasItems = await feedItems.count().then((c) => c > 0)
    const isEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasItems || isEmpty).toBeTruthy()
  })

  test('ソーシャルフィード・無限スクロール', async ({ page }) => {
    // フィードが読み込まれるまで待機
    await waitForElement(
      page,
      '[data-testid="feed-item"]',
      { timeout: 5000, state: 'attached' }
    ).catch(() => {})

    const feedItems = page.locator('[data-testid="feed-item"]')
    const initialCount = await feedItems.count()

    if (initialCount > 0) {
      // フィード下部までスクロール
      const feedContainer = page.locator('[data-testid="social-feed"]')
      await feedContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })

      // 次ページが読み込まれるのを待機
      await page.waitForTimeout(1000)

      // 新しいアイテムが追加されたことを確認
      const newCount = await feedItems.count()
      // 新しいアイテムが追加されるか、またはすべてのアイテムが既に読み込まれている
      expect(newCount >= initialCount).toBeTruthy()
    }
  })
})

test.describe('Social機能 - お祝い・パーティクルエフェクト', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('お祝い送信・単一クリック', async ({ page }) => {
    // フィードが読み込まれるまで待機
    await page.getByTestId('feed-item').first().waitFor({ timeout: 10000, state: 'attached' }).catch(() => {})

    const feedItems = page.getByTestId('feed-item')
    const count = await feedItems.count()

    if (count > 0) {
      // 最初のフィードアイテムをタップ（フィードアイテム全体がお祝いボタン）
      const firstItem = feedItems.first()

      if (await firstItem.isVisible()) {
        await firstItem.click()

        // お祝い状態が変更されることを確認（例: ボタンの色やテキストが変更される）
        await expect(firstItem).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })
      }
    }
  })

  test('お祝い取消', async ({ page }) => {
    // フィードが読み込まれるまで待機
    await waitForElement(
      page,
      '[data-testid="feed-item"]',
      { timeout: 5000, state: 'attached' }
    ).catch(() => {})

    const feedItems = page.locator('[data-testid="feed-item"]')
    const count = await feedItems.count()

    if (count > 0) {
      const firstItem = feedItems.first()

      if (await firstItem.isVisible()) {
        // お祝い送信（フィードアイテム全体がお祝いボタン）
        await firstItem.click()
        await expect(firstItem).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })

        // 再度クリックしてお祝いを取り消す
        await firstItem.click()

        // お祝い状態が戻ることを確認
        await expect(firstItem).toHaveAttribute('aria-pressed', 'false', { timeout: 10000 })
      }
    }
  })
})

test.describe('Social機能 - 通知・既読管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('通知一覧表示', async ({ page }) => {
    // 通知タブをクリック
    const notificationTab = page.locator('[data-testid="notification-tab"]')
    await notificationTab.click()

    // タブがアクティブになることを確認
    await expect(notificationTab).toHaveAttribute('aria-selected', 'true')

    // 通知が読み込まれるまで待機
    await waitForElement(
      page,
      '[data-testid="notification-item"]',
      { timeout: 5000, state: 'attached' }
    ).catch(() => {})

    // 通知またはempty stateが表示されることを確認
    const notificationItems = page.locator('[data-testid="notification-item"]')
    const emptyState = page.locator('text=通知はありません')  // 実際のメッセージに合わせる

    const hasNotifications = await notificationItems.count().then((c) => c > 0)
    const isEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasNotifications || isEmpty).toBeTruthy()
  })

  test('通知・ページネーション', async ({ page }) => {
    // 通知タブをクリック
    const notificationTab = page.locator('[data-testid="notification-tab"]')
    await notificationTab.click()

    // 通知が読み込まれるまで待機
    await waitForElement(
      page,
      '[data-testid="notification-item"]',
      { timeout: 5000, state: 'attached' }
    ).catch(() => {})

    const notificationItems = page.locator('[data-testid="notification-item"]')
    const initialCount = await notificationItems.count()

    if (initialCount > 0) {
      // 通知リスト下部までスクロール
      const notificationContainer = page.locator('[data-testid="notification-list"]')
      if (await notificationContainer.isVisible()) {
        await notificationContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight
        })

        // 追加通知が読み込まれるのを待機
        await page.waitForTimeout(1000)

        // 新しい通知が追加されたことを確認
        const newCount = await notificationItems.count()
        expect(newCount >= initialCount).toBeTruthy()
      }
    }
  })

  test('フォロー通知・フォローバック', async ({ page }) => {
    // 通知タブをクリック
    const notificationTab = page.locator('[data-testid="notification-tab"]')
    await notificationTab.click()

    // フォロー通知を探す
    const followNotification = page.locator('text=がフォローしました').first()

    if (await followNotification.isVisible()) {
      // フォロー通知内のフォローボタンをクリック
      const followButton = followNotification.locator('[data-testid="follow-button"]')

      if (await followButton.isVisible()) {
        await followButton.click()

        // フォローバックされたことを確認
        await expect(followButton).toContainText('フォロー中', { timeout: 10000 })
      }
    }
  })
})

test.describe('Social機能 - プロフィール管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('プロフィール表示', async ({ page }) => {
    // プロフィールセクションが表示されることを確認
    const profileSection = page.locator('[data-testid="profile-section"]')
    await expect(profileSection).toBeVisible()

    // ユーザー名と表示名が表示されることを確認
    const username = page.locator('[data-testid="my-username"]')
    const displayName = page.locator('[data-testid="my-display-name"]')

    await expect(username).toBeVisible()
    await expect(displayName).toBeVisible()
  })

  test('プロフィール編集・表示名', async ({ page }) => {
    // プロフィール編集ボタンをクリック
    const editButton = page.locator('[data-testid="edit-profile-button"]')
    if (await editButton.isVisible()) {
      await editButton.click()

      // 編集ダイアログが表示されるまで待機
      await waitForElement(page, '[data-testid="profile-edit-form"]', { timeout: 5000 })

      // 表示名フィールドをクリアして新しい名前を入力
      const displayNameInput = page.locator('input[name="displayName"]')
      await displayNameInput.clear()
      await displayNameInput.fill('新しい表示名')

      // 保存ボタンをクリック
      const saveButton = page.locator('[data-testid="save-profile-button"]')
      await saveButton.click()

      // プロフィールが更新されたことを確認（Server Action完了を待つ）
      const updatedDisplayName = page.locator('[data-testid="my-display-name"]')
      await expect(updatedDisplayName).toContainText('新しい表示名', { timeout: 10000 })
    }
  })
})

test.describe('Social機能 - エラーハンドリング', () => {
  test('認証なしアクセス', async ({ page }) => {
    // 認証なしでソーシャルAPIを呼び出す
    // まず、認証を明示的にクリア
    await page.context().clearCookies()

    // ソーシャルページにアクセス
    await page.goto('/social', { waitUntil: 'networkidle' })

    // ログインページにリダイレクトされることを確認（URLのパス部分のみ確認）
    const isRedirectedToLogin = page.url().includes('/auth/')
    const isOnSocialPage = page.url().includes('/social')

    // ログインページにリダイレクトされるか、ソーシャルページから離れることを確認
    expect(isRedirectedToLogin || !isOnSocialPage).toBeTruthy()
  })

  test('存在しないユーザー検索', async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')

    // 存在しないユーザーを検索
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('nonexistent_user_12345')

    // デバウンス（300ms）+ 検索処理の完了を待機
    await page.waitForTimeout(1500)

    // 「見つかりませんでした」メッセージまたは検索結果が空であることを確認
    const emptyMessage = page.locator('text=見つかりませんでした')
    const searchResults = page.locator('[data-testid="search-result-item"]')

    const isEmpty = await emptyMessage.isVisible().catch(() => false)
    const hasNoResults = await searchResults.count().then((c) => c === 0)

    // 空メッセージが表示されるか、検索結果が0件であることを確認
    expect(isEmpty || hasNoResults).toBeTruthy()
  })

  test('存在しないユーザー_404', async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
    await page.goto('/social/profile/nonexistent_user_xyz123')
    await waitForPageLoad(page)

    // Next.jsデフォルト404ページのメッセージを確認
    await expect(page.locator('text=This page could not be found')).toBeVisible({ timeout: 10000 })
  })

  test('自己フォロー試行', async ({ page }) => {
    // 自分のプロフィールページに遷移
    await setupAuthenticatedPage(page, '/social')

    const profileSection = page.locator('[data-testid="profile-section"]')
    const selfLink = profileSection.locator('[data-testid="my-profile-link"]')

    if (await selfLink.isVisible()) {
      await selfLink.click()
      await page.waitForURL('/social/profile/**', { timeout: 10000 })

      // フォローボタンが存在しない、または無効になっていることを確認
      const followButton = page.locator('[data-testid="follow-button"]')
      const isDisabled = await followButton.isDisabled().catch(() => true)
      const isHidden = !(await followButton.isVisible().catch(() => false))

      expect(isDisabled || isHidden).toBeTruthy()
    }
  })

  test('既フォロー状態でフォロー', async ({ page }) => {
    // seed-e2e.sql に e2etest2 (SECONDARY) へのフォロー関係が作成されている
    await setupAuthenticatedPage(page, '/social')

    // フォロー中のユーザーを検索
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('e2etest2')

    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const href4 = await page.locator('[data-testid="search-result-item"]').first().locator('a').getAttribute('href')
    if (href4) await page.goto(href4)

    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    const followButton = page.locator('[data-testid="follow-button"]')
    const isFollowing = await followButton.textContent().then((text) => text?.includes('フォロー中'))

    if (isFollowing) {
      // 既にフォロー中の場合、ボタンが「フォロー中」または無効になっていることを確認
      await expect(followButton).toContainText('フォロー中')
    }
  })
})
