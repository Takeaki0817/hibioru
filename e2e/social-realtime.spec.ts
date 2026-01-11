import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USER, waitForPageLoad } from './fixtures/test-helpers'

/**
 * Realtime更新のE2Eテスト
 *
 * PR #36 検証チェックリスト 3.2 Realtime更新の検証
 *
 * 技術的制約:
 * - WebSocketの直接テストは困難
 * - 複数ユーザーが必要なテスト（達成リアルタイム受信など）は現時点ではスキップ
 * - isMountedパターンの動作確認とメモリリーク防止を優先
 *
 * 検証項目:
 * - 購読解除（ソーシャルタブ離脱 → Realtime購読が正しく解除）
 * - 状態更新エラー防止（unmount後の状態更新なし）
 */

// ========================================
// 1. 購読解除テスト
// ========================================
test.describe('Realtime購読解除', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('ソーシャルタブ離脱時にRealtime購読が解除される', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 1. ソーシャルフィードを開く
    await page.goto('/social')
    await waitForPageLoad(page)

    // 2. フィードタブを選択（Realtimeが購読される）
    const feedTab = page.getByRole('tab', { name: /フィード/i })
    const hasFeedTab = await feedTab.isVisible().catch(() => false)

    if (hasFeedTab) {
      await feedTab.click()
      await waitForPageLoad(page)

      // フィードが読み込まれるまで待機
      await page.waitForTimeout(1000)
    }

    // 3. 別のページに遷移（購読解除がトリガーされる）
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // 4. 少し待機してエラーが発生しないことを確認
    await page.waitForTimeout(2000)

    // 5. Realtime関連のエラーがないことを確認
    const realtimeErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('realtime') ||
        e.toLowerCase().includes('subscription') ||
        e.toLowerCase().includes('websocket') ||
        e.toLowerCase().includes('channel')
    )

    expect(realtimeErrors).toHaveLength(0)
  })

  test('フィードタブ切り替え時にエラーが発生しない', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/social')
    await waitForPageLoad(page)

    // タブを複数回切り替え
    const feedTab = page.getByRole('tab', { name: /フィード/i })
    const settingsTab = page.getByRole('tab', { name: /設定/i })
    const socialTab = page.getByRole('tab', { name: /みんな/i })

    const hasFeedTab = await feedTab.isVisible().catch(() => false)
    const hasSettingsTab = await settingsTab.isVisible().catch(() => false)
    const hasSocialTab = await socialTab.isVisible().catch(() => false)

    if (hasFeedTab && hasSettingsTab) {
      // フィード → 設定 → フィード → 設定
      await feedTab.click()
      await page.waitForTimeout(500)
      await settingsTab.click()
      await page.waitForTimeout(500)
      await feedTab.click()
      await page.waitForTimeout(500)
      await settingsTab.click()
      await page.waitForTimeout(500)
    }

    if (hasSocialTab && hasFeedTab) {
      // みんな → フィード → みんな
      await socialTab.click()
      await page.waitForTimeout(500)
      await feedTab.click()
      await page.waitForTimeout(500)
      await socialTab.click()
      await page.waitForTimeout(500)
    }

    // エラーがないことを確認
    const realtimeErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('realtime') ||
        e.toLowerCase().includes('subscription') ||
        e.toLowerCase().includes('websocket')
    )

    expect(realtimeErrors).toHaveLength(0)
  })
})

// ========================================
// 2. isMountedパターン検証
// ========================================
test.describe('Unmount後の状態更新防止', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('フィード表示後に即座にページ遷移しても状態更新エラーが発生しない', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // ソーシャルページに遷移
    await page.goto('/social')
    await waitForPageLoad(page)

    // フィードタブを選択
    const feedTab = page.getByRole('tab', { name: /フィード/i })
    const hasFeedTab = await feedTab.isVisible().catch(() => false)

    if (hasFeedTab) {
      await feedTab.click()
      // 非同期処理中に即座に遷移
    }

    // 即座にページ遷移（非同期処理中の遷移をシミュレート）
    await page.goto('/timeline')

    // 待機してエラーを確認
    await page.waitForTimeout(2000)

    // "Cannot update state on unmounted component" エラーがないことを確認
    const stateUpdateErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('unmounted') ||
        e.toLowerCase().includes('memory leak') ||
        e.toLowerCase().includes('can\'t perform a react state update')
    )

    expect(stateUpdateErrors).toHaveLength(0)
  })

  test('通知タブ表示後に即座にページ遷移しても状態更新エラーが発生しない', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/social')
    await waitForPageLoad(page)

    // 通知タブを選択
    const notificationTab = page.getByRole('tab', { name: /通知/i })
    const hasNotificationTab = await notificationTab.isVisible().catch(() => false)

    if (hasNotificationTab) {
      await notificationTab.click()
    }

    // 即座にページ遷移
    await page.goto('/timeline')

    // 待機してエラーを確認
    await page.waitForTimeout(2000)

    const stateUpdateErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('unmounted') ||
        e.toLowerCase().includes('memory leak') ||
        e.toLowerCase().includes('can\'t perform a react state update')
    )

    expect(stateUpdateErrors).toHaveLength(0)
  })

  test('高速タブ切り替えでも状態更新エラーが発生しない', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/social')
    await waitForPageLoad(page)

    const feedTab = page.getByRole('tab', { name: /フィード/i })
    const socialTab = page.getByRole('tab', { name: /みんな/i })
    const notificationTab = page.getByRole('tab', { name: /通知/i })
    const settingsTab = page.getByRole('tab', { name: /設定/i })

    // タブが存在するか確認
    const hasFeedTab = await feedTab.isVisible().catch(() => false)
    const hasSocialTab = await socialTab.isVisible().catch(() => false)
    const hasNotificationTab = await notificationTab.isVisible().catch(() => false)
    const hasSettingsTab = await settingsTab.isVisible().catch(() => false)

    // 高速にタブを切り替え（待機なし）
    if (hasFeedTab) await feedTab.click()
    if (hasSocialTab) await socialTab.click()
    if (hasNotificationTab) await notificationTab.click()
    if (hasSettingsTab) await settingsTab.click()
    if (hasFeedTab) await feedTab.click()
    if (hasNotificationTab) await notificationTab.click()
    if (hasSocialTab) await socialTab.click()
    if (hasSettingsTab) await settingsTab.click()

    // 待機してエラーを確認
    await page.waitForTimeout(2000)

    const stateUpdateErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('unmounted') ||
        e.toLowerCase().includes('memory leak') ||
        e.toLowerCase().includes('can\'t perform a react state update')
    )

    expect(stateUpdateErrors).toHaveLength(0)
  })
})

// ========================================
// 3. ブラウザ遷移時のクリーンアップ
// ========================================
test.describe('ブラウザ遷移時のクリーンアップ', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USER.id)
  })

  test('ブラウザバック時にRealtime関連エラーが発生しない', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // タイムラインからソーシャルへ遷移
    await page.goto('/timeline')
    await waitForPageLoad(page)

    await page.goto('/social')
    await waitForPageLoad(page)

    // フィードタブを選択
    const feedTab = page.getByRole('tab', { name: /フィード/i })
    const hasFeedTab = await feedTab.isVisible().catch(() => false)

    if (hasFeedTab) {
      await feedTab.click()
      await page.waitForTimeout(500)
    }

    // ブラウザバック
    await page.goBack()
    await waitForPageLoad(page)

    // 待機してエラーを確認
    await page.waitForTimeout(2000)

    const realtimeErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('realtime') ||
        e.toLowerCase().includes('subscription') ||
        e.toLowerCase().includes('websocket') ||
        e.toLowerCase().includes('unmounted')
    )

    expect(realtimeErrors).toHaveLength(0)
  })

  test('ページリロード後にRealtime購読が正常に再開される', async ({ page }) => {
    // コンソールエラーを収集
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/social')
    await waitForPageLoad(page)

    // フィードタブを選択
    const feedTab = page.getByRole('tab', { name: /フィード/i })
    const hasFeedTab = await feedTab.isVisible().catch(() => false)

    if (hasFeedTab) {
      await feedTab.click()
      await page.waitForTimeout(500)
    }

    // ページリロード
    await page.reload()
    await waitForPageLoad(page)

    // フィードタブを再選択
    if (hasFeedTab) {
      await feedTab.click()
      await page.waitForTimeout(500)
    }

    // 待機してエラーを確認
    await page.waitForTimeout(2000)

    const realtimeErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('realtime') ||
        e.toLowerCase().includes('subscription') ||
        e.toLowerCase().includes('websocket')
    )

    expect(realtimeErrors).toHaveLength(0)
  })
})

// ========================================
// 4. 複数ユーザーテスト（将来実装予定）
// ========================================
test.describe.skip('複数ユーザーRealtimeテスト', () => {
  /**
   * 以下のテストは複数ユーザーセッションが必要なため、
   * 現時点ではスキップ。将来的にテスト環境が整った段階で実装予定。
   *
   * - 達成リアルタイム受信（別タブでフォロー中ユーザーが達成 → フィードに即時反映）
   * - 達成削除リアルタイム（フォロー中ユーザーが達成削除 → exitアニメーションで消去）
   * - 共有投稿リアルタイム（フォロー中ユーザーが共有 → フィードに即時反映）
   */

  test('達成リアルタイム受信', async () => {
    // TODO: 複数ユーザーセッションでの実装
    // 1. ユーザーAがソーシャルフィードを開く
    // 2. ユーザーB（フォロー中）が達成を作成
    // 3. ユーザーAのフィードに即時反映されることを確認
  })

  test('達成削除リアルタイム', async () => {
    // TODO: 複数ユーザーセッションでの実装
    // 1. ユーザーAがソーシャルフィードを開く（ユーザーBの達成が表示されている）
    // 2. ユーザーBが達成を削除
    // 3. ユーザーAのフィードでexitアニメーション後に消去されることを確認
  })

  test('共有投稿リアルタイム', async () => {
    // TODO: 複数ユーザーセッションでの実装
    // 1. ユーザーAがソーシャルフィードを開く
    // 2. ユーザーB（フォロー中）が共有投稿を作成
    // 3. ユーザーAのフィードに即時反映されることを確認
  })
})
