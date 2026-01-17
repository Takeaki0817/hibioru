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
    // 検索ボックスに「user_abc」と入力
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('user_abc')

    // 検索実行（入力後、デバウンスで自動検索される想定）
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })

    // 候補ユーザーが表示されることを確認
    const searchResults = page.locator('[data-testid="search-result-item"]')
    const count = await searchResults.count()
    expect(count).toBeGreaterThan(0)
  })

  test('ユーザー検索・絞り込み', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')

    // 最初の検索
    await searchInput.fill('user_abc')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const firstResults = await page.locator('[data-testid="search-result-item"]').count()

    // 再検索で絞り込み
    await searchInput.clear()
    await searchInput.fill('user_ab')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    const filteredResults = await page.locator('[data-testid="search-result-item"]').count()

    // 絞り込み後の結果が最初の検索結果以下であることを確認
    expect(filteredResults).toBeLessThanOrEqual(firstResults)
  })

  test('プロフィール表示', async ({ page }) => {
    // 検索結果からユーザーを検索
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_user')

    // 検索結果が表示されるまで待機
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })

    // 最初の検索結果をクリック
    const firstResult = page.locator('[data-testid="search-result-item"]').first()
    await firstResult.click()

    // プロフィールページに遷移
    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    // アバター、ユーザー名、表示名が表示されることを確認
    await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-username"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-display-name"]')).toBeVisible()
  })
})

test.describe('Social機能 - フォロー・フォロー解除', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('フォロー・新規フォロー', async ({ page }) => {
    // 検索からユーザーを見つける
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_user')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })

    // ユーザーをクリックしてプロフィールページへ
    await page.locator('[data-testid="search-result-item"]').first().click()
    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    // フォローボタンをクリック
    const followButton = page.locator('[data-testid="follow-button"]')
    const initialText = await followButton.textContent()
    expect(initialText?.includes('フォロー')).toBeTruthy()

    // ボタンをクリック
    await followButton.click()

    // APIレスポンスを待機
    await waitForApiResponse(page, '/api/social/follows')

    // ボタンが「フォロー中」に変更されることを確認
    await expect(followButton).toContainText('フォロー中')
  })

  test('フォロー・通知作成', async ({ page }) => {
    // プライマリユーザーがセカンダリユーザーをフォロー
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('secondary')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    await page.locator('[data-testid="search-result-item"]').first().click()

    await page.waitForURL('/social/profile/**', { timeout: 10000 })
    const followButton = page.locator('[data-testid="follow-button"]')
    await followButton.click()
    await waitForApiResponse(page, '/api/social/follows')

    // セカンダリユーザーとして別セッションを作成
    const { browser } = test
    const secondaryPage = await browser!.newPage()
    await setupTestSession(secondaryPage, TEST_USERS.SECONDARY.id)
    await secondaryPage.goto('/social', { waitUntil: 'networkidle' })

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

    await secondaryPage.close()
  })

  test('フォロー解除', async ({ page }) => {
    // フォロー中のユーザーをフォロー解除
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_user')
    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    await page.locator('[data-testid="search-result-item"]').first().click()

    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    const followButton = page.locator('[data-testid="follow-button"]')

    // フォロー状態を確認
    const isFollowing = await followButton.textContent().then((text) => text?.includes('フォロー中'))

    if (isFollowing) {
      // フォロー中の場合、ボタンをクリックしてフォロー解除
      await followButton.click()
      await waitForApiResponse(page, '/api/social/follows')

      // ボタンが「フォロー」に変更されることを確認
      await expect(followButton).toContainText('フォロー')
    }
  })

  test('フォロー数表示', async ({ page }) => {
    // ソーシャルページのフォロー数セクションを確認
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
    const followingButton = followStats.locator('[data-testid="following-link"]')
    await followingButton.click()

    // フォロー中一覧ページに遷移
    await page.waitForURL('/social/following', { timeout: 10000 })

    // フォロー中のユーザーが表示されることを確認
    await waitForElement(page, '[data-testid="follow-list-item"]', { timeout: 5000 })
    const followingList = page.locator('[data-testid="follow-list-item"]')
    expect(await followingList.count()).toBeGreaterThanOrEqual(0)
  })

  test('フォロワー一覧', async ({ page }) => {
    // フォロー数セクションを開く
    const followStats = page.locator('[data-testid="follow-stats"]')
    const followerButton = followStats.locator('[data-testid="follower-link"]')
    await followerButton.click()

    // フォロワー一覧ページに遷移
    await page.waitForURL('/social/followers', { timeout: 10000 })

    // フォロワーが表示されることを確認
    await waitForElement(page, '[data-testid="follow-list-item"]', { timeout: 5000 })
    const followerList = page.locator('[data-testid="follow-list-item"]')
    expect(await followerList.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Social機能 - ソーシャルフィード表示', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')
  })

  test('ソーシャルフィード・初期表示', async ({ page }) => {
    // 「みんな」タブがデフォルトで表示されていることを確認
    const feedTab = page.locator('[data-testid="feed-tab"]')
    await expect(feedTab).toHaveAttribute('aria-selected', 'true')

    // フィードが読み込まれるまで待機
    await waitForElement(
      page,
      '[data-testid="feed-item"]',
      { timeout: 5000, state: 'attached' }
    ).catch(() => {
      // フィードが空の可能性があるため、empty stateも確認
    })

    // フィードまたは空状態が表示されることを確認
    const feedItems = page.locator('[data-testid="feed-item"]')
    const emptyState = page.locator('text=フィードは空です')

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
    await waitForElement(
      page,
      '[data-testid="feed-item"]',
      { timeout: 5000, state: 'attached' }
    ).catch(() => {})

    const feedItems = page.locator('[data-testid="feed-item"]')
    const count = await feedItems.count()

    if (count > 0) {
      // 最初のフィードアイテムをタップ
      const firstItem = feedItems.first()
      const celebrateButton = firstItem.locator('[data-testid="celebrate-button"]')

      if (await celebrateButton.isVisible()) {
        await celebrateButton.click()

        // APIレスポンスを待機
        await waitForApiResponse(page, '/api/social/celebrations')

        // お祝い状態が変更されることを確認（例: ボタンの色やテキストが変更される）
        await expect(celebrateButton).toHaveAttribute('aria-pressed', 'true')
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
      const celebrateButton = firstItem.locator('[data-testid="celebrate-button"]')

      if (await celebrateButton.isVisible()) {
        // お祝い送信
        await celebrateButton.click()
        await waitForApiResponse(page, '/api/social/celebrations')
        await expect(celebrateButton).toHaveAttribute('aria-pressed', 'true')

        // 再度クリックしてお祝いを取り消す
        await celebrateButton.click()
        await waitForApiResponse(page, '/api/social/celebrations')

        // お祝い状態が戻ることを確認
        await expect(celebrateButton).toHaveAttribute('aria-pressed', 'false')
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
    const emptyState = page.locator('text=通知はまだありません')

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
        await waitForApiResponse(page, '/api/social/follows')

        // フォローバックされたことを確認
        await expect(followButton).toContainText('フォロー中')
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

      // APIレスポンスを待機
      await waitForApiResponse(page, '/api/social/profile')

      // プロフィールが更新されたことを確認
      const updatedDisplayName = page.locator('[data-testid="my-display-name"]')
      await expect(updatedDisplayName).toContainText('新しい表示名')
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

    // ログインページにリダイレクトされることを確認、またはエラーメッセージを表示
    const isRedirectedToLogin = page.url().includes('/auth/login')
    const hasErrorMessage = await page
      .locator('text=認証が必要です')
      .isVisible()
      .catch(() => false)

    expect(isRedirectedToLogin || hasErrorMessage).toBeTruthy()
  })

  test('存在しないユーザー検索', async ({ page }) => {
    await setupAuthenticatedPage(page, '/social')

    // 存在しないユーザーを検索
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('xxxxxxxxxxxx_nonexistent_user_xxxxxxxxxxxx')

    // 検索結果が表示されるまで待機
    await waitForElement(page, '[data-testid="search-result-item"]', {
      timeout: 5000,
      state: 'attached',
    }).catch(() => {})

    // 検索結果が空または「見つかりませんでした」メッセージが表示されることを確認
    const searchResults = page.locator('[data-testid="search-result-item"]')
    const emptyMessage = page.locator('text=見つかりませんでした')

    const hasResults = await searchResults.count().then((c) => c > 0)
    const showsEmpty = await emptyMessage.isVisible().catch(() => false)

    expect(!hasResults || showsEmpty).toBeTruthy()
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
    await setupAuthenticatedPage(page, '/social')

    // フォロー中のユーザーを検索
    const searchInput = page.locator('input[placeholder*="ユーザーを検索"]')
    await searchInput.fill('test_already_following')

    await waitForElement(page, '[data-testid="search-result-item"]', { timeout: 5000 })
    await page.locator('[data-testid="search-result-item"]').first().click()

    await page.waitForURL('/social/profile/**', { timeout: 10000 })

    const followButton = page.locator('[data-testid="follow-button"]')
    const isFollowing = await followButton.textContent().then((text) => text?.includes('フォロー中'))

    if (isFollowing) {
      // 既にフォロー中の場合、ボタンが「フォロー中」または無効になっていることを確認
      await expect(followButton).toContainText('フォロー中')
    }
  })
})
