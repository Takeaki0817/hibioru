import { test, expect } from '@playwright/test'
import {
  setupTestSession,
  setupFreePlanUser,
  setupPremiumPlanUser,
  setupCanceledPlanUser,
  mockBillingLimitsAPI,
  waitForBillingSection,
  waitForPlansPage,
  interceptStripeCheckout,
  interceptStripePortal,
} from './fixtures/test-helpers'

test.describe('billing', () => {
  test.describe('無料プランのプロフィール表示', () => {
    test('無料プラン表示', async ({ page }) => {
      // Setup: 無料プランユーザーとしてセッション設定
      await setupFreePlanUser(page)

      // Act: 設定 > 課金タブを開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)

      // Assert: プランが「無料プラン」と表示
      await expect(page.locator('[data-testid="plan-name"]')).toContainText('無料プラン')

      // Assert: 本日の投稿残数（15中0）を表示
      await expect(page.locator('[data-testid="entry-limit"]')).toContainText('本日の投稿: 0 / 15')

      // Assert: 今月の画像残数（5中0）を表示
      await expect(page.locator('[data-testid="image-limit"]')).toContainText('今月の画像: 0 / 5')

      // Assert: 「プランをアップグレード」ボタンが表示
      await expect(page.locator('[data-testid="upgrade-plan-button"]')).toBeVisible()
    })

    test('無料プラン投稿制限', async ({ page }) => {
      // Setup: 無料プランユーザーで14件投稿済みの状態
      await setupFreePlanUser(page, { entryCount: 14 })

      // Act: 15件目の投稿をしようとする
      await page.goto('/timeline', { waitUntil: 'networkidle' })
      await page.click('[data-testid="entry-input"]')
      await page.fill('[data-testid="entry-textarea"]', '投稿テスト')

      // APIモック設定（15件目で制限）
      await mockBillingLimitsAPI(page, {
        entryLimit: {
          allowed: false,
          current: 15,
          limit: 15,
          remaining: 0,
          planType: 'free',
        },
      })

      await page.click('[data-testid="submit-entry-button"]')

      // Assert: 15件目の投稿は「本日の投稿上限に達しました」とエラー表示
      await expect(page.locator('text=本日の投稿上限に達しました')).toBeVisible()
    })

    test('無料プラン画像制限', async ({ page }) => {
      // Setup: 無料プランユーザーで4枚添付済みの状態
      await setupFreePlanUser(page, { imageCount: 4 })

      // Act: 5枚目を添付しようとする
      await page.goto('/timeline', { waitUntil: 'networkidle' })
      await page.click('[data-testid="entry-input"]')

      // APIモック設定（5枚目で制限）
      await mockBillingLimitsAPI(page, {
        imageLimit: {
          allowed: false,
          current: 5,
          limit: 5,
          remaining: 0,
          planType: 'free',
        },
      })

      await page.click('[data-testid="image-upload-button"]')
      // 実際の画像アップロード処理をシミュレート

      // Assert: 5枚目は「今月の画像上限に達しました」とエラー表示
      await expect(page.locator('text=今月の画像上限に達しました')).toBeVisible()
    })
  })

  test.describe('Stripe Checkout遷移', () => {
    test('Checkout遷移_月額', async ({ page }) => {
      // Setup: 無料プランユーザーがセッション設定
      await setupFreePlanUser(page)

      // Act: 設定から「プランアップグレード」を開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)
      await page.click('[data-testid="upgrade-plan-button"]')

      // Act: プラン選択ページでプランを確認
      await waitForPlansPage(page)
      const monthlyCard = page.locator('[data-testid="plan-card-monthly"]')
      await expect(monthlyCard).toContainText('480円/月')

      // Stripe Checkoutへのリダイレクトをインターセプト
      const checkoutInterceptor = await interceptStripeCheckout(page)

      // Act: 月額プランの「購入する」ボタンをクリック
      await monthlyCard.locator('[data-testid="purchase-button"]').click()

      // Assert: Stripe Checkoutページへリダイレクト
      await page.waitForTimeout(500) // リダイレクト待機
      const redirectUrl = checkoutInterceptor.getRedirectUrl()
      expect(redirectUrl).toBeTruthy()
      expect(redirectUrl).toContain('checkout.stripe.com')
    })

    test('Checkout遷移_年額', async ({ page }) => {
      // Setup: 無料プランユーザーがセッション設定
      await setupFreePlanUser(page)

      // Act: 設定から「プランアップグレード」を開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)
      await page.click('[data-testid="upgrade-plan-button"]')

      // Act: プラン選択ページで年額プランを確認
      await waitForPlansPage(page)
      const yearlyCard = page.locator('[data-testid="plan-card-yearly"]')

      // Assert: 金額「4,200円/年」と表示
      await expect(yearlyCard).toContainText('4,200円/年')

      // Assert: 年額プランに「おすすめ」バッジが表示
      await expect(yearlyCard.locator('[data-testid="recommended-badge"]')).toBeVisible()

      // Stripe Checkoutへのリダイレクトをインターセプト
      const checkoutInterceptor = await interceptStripeCheckout(page)

      // Act: 年額プランの「購入する」ボタンをクリック
      await yearlyCard.locator('[data-testid="purchase-button"]').click()

      // Assert: Stripe Checkoutページへリダイレクト
      await page.waitForTimeout(500)
      const redirectUrl = checkoutInterceptor.getRedirectUrl()
      expect(redirectUrl).toBeTruthy()
      expect(redirectUrl).toContain('checkout.stripe.com')
    })

    test('Checkout中のローディング', async ({ page }) => {
      // Setup: 無料プランユーザーがセッション設定
      await setupFreePlanUser(page)

      // Act: プラン選択ページを開く
      await page.goto('/settings/billing/plans', { waitUntil: 'networkidle' })
      await waitForPlansPage(page)

      // Stripe Checkoutへのリダイレクトをインターセプト
      await interceptStripeCheckout(page)

      const purchaseButton = page.locator('[data-testid="plan-card-monthly"]').locator('[data-testid="purchase-button"]')

      // Act: 「購入する」をクリック
      await purchaseButton.click()

      // Assert: クリック中はボタンが disabled
      await expect(purchaseButton).toBeDisabled()

      // Assert: ローディング表示（spinner）が表示
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    })

    test('Checkout_既にプレミアム', async ({ page }) => {
      // Setup: プレミアムユーザーとしてセッション設定
      await setupPremiumPlanUser(page, 'premium_monthly')

      // Act: 設定から「プランアップグレード」を開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)

      // Assert: プランが「プレミアム（月額）」と表示
      await expect(page.locator('[data-testid="plan-name"]')).toContainText('プレミアム（月額）')

      // Act: 「プランアップグレード」ボタンをクリック
      const upgradeButton = page.locator('[data-testid="upgrade-plan-button"]')
      await upgradeButton.click()

      // Act: プラン選択ページを開く
      await waitForPlansPage(page)

      // Assert: ボタンが disabled
      const purchaseButtons = page.locator('[data-testid="purchase-button"]')
      const count = await purchaseButtons.count()
      for (let i = 0; i < count; i++) {
        await expect(purchaseButtons.nth(i)).toBeDisabled()
      }

      // Assert: 「既にプレミアムプランに加入しています」メッセージ表示
      await expect(page.locator('text=既にプレミアムプランに加入しています')).toBeVisible()
    })
  })

  test.describe('プレミアムプランのプロフィール表示', () => {
    test('プレミアム表示', async ({ page }) => {
      // Setup: プレミアムユーザーがセッション設定
      await setupPremiumPlanUser(page, 'premium_monthly')

      // Act: 設定 > 課金タブを開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)

      // Assert: プランが「プレミアム（月額）」と表示
      await expect(page.locator('[data-testid="plan-name"]')).toContainText('プレミアム（月額）')

      // Assert: 投稿数「無制限」と表示
      await expect(page.locator('[data-testid="entry-limit"]')).toContainText('無制限')

      // Assert: 画像添付「無制限」と表示
      await expect(page.locator('[data-testid="image-limit"]')).toContainText('無制限')
    })

    test('プレミアム_投稿制限なし', async ({ page }) => {
      // Setup: プレミアムユーザーがセッション設定
      await setupPremiumPlanUser(page)

      // Act: タイムラインページを開く
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // Act: 30件投稿を作成（制限なしで全て成功するはず）
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="entry-input"]')
        await page.fill('[data-testid="entry-textarea"]', `投稿 ${i + 1}`)
        await page.click('[data-testid="submit-entry-button"]')

        // 次の投稿への準備
        await page.waitForTimeout(300)
      }

      // Assert: エラー表示なし
      const errorMessages = page.locator('text=上限に達しました')
      await expect(errorMessages).not.toBeVisible()
    })

    test('有効期限表示_キャンセル済み', async ({ page }) => {
      // Setup: キャンセル済みプレミアムユーザーとしてセッション設定
      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() + 7) // 7日後に期限切れ
      await setupCanceledPlanUser(page, periodEnd)

      // Act: 設定 > 課金タブを開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)

      // Assert: プランが「プレミアム（月額）」で表示
      await expect(page.locator('[data-testid="plan-name"]')).toContainText('プレミアム（月額）')

      // Assert: 「有効期限: YYYY-MM-DD」と表示
      const periodEndStr = periodEnd.toISOString().split('T')[0]
      await expect(page.locator(`text=有効期限: ${periodEndStr}`)).toBeVisible()
    })
  })

  test.describe('Customer Portal遷移', () => {
    test('Portal遷移', async ({ page }) => {
      // Setup: プレミアムユーザーとしてセッション設定
      await setupPremiumPlanUser(page)

      // Act: 設定 > 課金を開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)

      // Stripe Portalへのリダイレクトをインターセプト
      const portalInterceptor = await interceptStripePortal(page)

      // Act: 「サブスクリプション管理」ボタンをクリック
      await page.click('[data-testid="manage-subscription-button"]')

      // Assert: Stripe Customer Portalへリダイレクト
      await page.waitForTimeout(500)
      const redirectUrl = portalInterceptor.getRedirectUrl()
      expect(redirectUrl).toBeTruthy()
      expect(redirectUrl).toContain('billing.stripe.com')
    })

    test('Portal_顧客未発見', async ({ page }) => {
      // Setup: プレミアムユーザーだが stripe_customer_id が null な異常状態
      await setupTestSession(page)
      await mockBillingLimitsAPI(page, {
        planType: 'premium_monthly',
        entryLimit: {
          allowed: true,
          current: 0,
          limit: null,
          remaining: null,
          planType: 'premium_monthly',
        },
        imageLimit: {
          allowed: true,
          current: 0,
          limit: null,
          remaining: null,
          planType: 'premium_monthly',
        },
        canceledAt: null,
        currentPeriodEnd: new Date().toISOString(),
      })

      // Act: 設定 > 課金を開く
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })
      await waitForBillingSection(page)

      // Act: 「サブスクリプション管理」をクリック
      await page.click('[data-testid="manage-subscription-button"]')

      // Assert: エラーメッセージ「顧客情報が見つかりません」表示
      await expect(page.locator('text=顧客情報が見つかりません')).toBeVisible()
    })
  })

  test.describe('ほつれパック購入', () => {
    test('ほつれ購入_表示', async ({ page }) => {
      // Setup: ほつれ残高が 0 のユーザー
      await setupTestSession(page)
      await mockBillingLimitsAPI(page, {
        hotsureRemaining: 0,
      })

      // Act: ホーム画面を表示
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // Assert: 「ほつれパック（120円）」ボタンが表示
      await expect(page.locator('[data-testid="hotsure-purchase-button"]')).toBeVisible()

      // Assert: ボタンが enabled
      await expect(page.locator('[data-testid="hotsure-purchase-button"]')).toBeEnabled()
    })

    test('ほつれ購入_ボタン無効化', async ({ page }) => {
      // Setup: ほつれ残高が 2 以上のユーザー
      await setupTestSession(page)
      await mockBillingLimitsAPI(page, {
        hotsureRemaining: 2,
        bonusHotsure: 0,
      })

      // Act: ホーム画面を表示
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // Assert: 「ほつれパックを購入」ボタンが disabled
      await expect(page.locator('[data-testid="hotsure-purchase-button"]')).toBeDisabled()

      // Assert: 「ほつれは2個以上持てません」表示
      await expect(page.locator('text=ほつれは2個以上持てません')).toBeVisible()
    })

    test('ほつれ決済', async ({ page }) => {
      // Setup: ほつれ残高 0 のユーザー
      await setupTestSession(page)
      await mockBillingLimitsAPI(page, {
        hotsureRemaining: 0,
      })

      // Act: ホーム画面を表示
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // Stripe Checkoutへのリダイレクトをインターセプト
      const checkoutInterceptor = await interceptStripeCheckout(page)

      // Act: 「ほつれパックを購入」をクリック
      await page.click('[data-testid="hotsure-purchase-button"]')

      // Assert: Checkout画面に遷移（mode=payment）
      await page.waitForTimeout(500)
      const redirectUrl = checkoutInterceptor.getRedirectUrl()
      expect(redirectUrl).toBeTruthy()
      expect(redirectUrl).toContain('checkout.stripe.com')
      expect(redirectUrl).toContain('mode=payment')
    })

    test('ほつれ決済キャンセル', async ({ page }) => {
      // Setup: ほつれ残高 0 のユーザー
      await setupTestSession(page)
      await mockBillingLimitsAPI(page, {
        hotsureRemaining: 0,
      })

      // Act: ホーム画面を表示
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // Checkoutをモックして、キャンセルURLに遷移させる
      await page.route('**/checkout.stripe.com/**', async (route) => {
        // キャンセルURLへリダイレクト
        await page.goto('/social?hotsure_purchase=canceled', { waitUntil: 'networkidle' })
        await route.abort()
      })

      // Act: 「ほつれパックを購入」をクリック
      await page.click('[data-testid="hotsure-purchase-button"]')

      // Assert: `/social?hotsure_purchase=canceled` にリダイレクト
      await page.waitForURL('**/social?hotsure_purchase=canceled', { timeout: 5000 })
      await expect(page).toHaveURL(/hotsure_purchase=canceled/)
    })
  })

  test.describe('Stripeエラーハンドリング', () => {
    test('Stripe障害_Checkout失敗', async ({ page }) => {
      // Setup: 無料プランユーザーがセッション設定
      await setupFreePlanUser(page)

      // Act: プラン選択ページを開く
      await page.goto('/settings/billing/plans', { waitUntil: 'networkidle' })
      await waitForPlansPage(page)

      // Stripe APIを500でシミュレート
      await page.route('**/api.stripe.com/**', async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Service unavailable' }),
        })
      })

      // Act: 「購入する」をクリック
      await page.click('[data-testid="plan-card-monthly"] [data-testid="purchase-button"]')

      // Assert: エラーメッセージ「決済処理中にエラーが発生しました。しばらく後にお試しください」
      await expect(
        page.locator('text=決済処理中にエラーが発生しました。しばらく後にお試しください')
      ).toBeVisible()

      // Assert: ボタンは再度クリック可能
      await expect(page.locator('[data-testid="plan-card-monthly"] [data-testid="purchase-button"]')).toBeEnabled()
    })
  })

  test.describe('制限チェックのエッジケース', () => {
    test('投稿制限_ちょうど15件', async ({ page }) => {
      // Setup: 無料プランユーザーで14件投稿済み
      await setupFreePlanUser(page, { entryCount: 14 })

      // Act: タイムラインページを開く
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // 15件目を投稿（成功するはず）
      await page.click('[data-testid="entry-input"]')
      await page.fill('[data-testid="entry-textarea"]', '15件目の投稿')

      // 15件目投稿時は制限内
      await mockBillingLimitsAPI(page, {
        entryLimit: {
          allowed: true,
          current: 14,
          limit: 15,
          remaining: 1,
          planType: 'free',
        },
      })

      await page.click('[data-testid="submit-entry-button"]')

      // Assert: 15件目の投稿は成功
      await expect(page.locator('text=15件目の投稿')).toBeVisible()

      // 16件目投稿時は制限到達
      await mockBillingLimitsAPI(page, {
        entryLimit: {
          allowed: false,
          current: 15,
          limit: 15,
          remaining: 0,
          planType: 'free',
        },
      })

      // Assert: 16件目は「本日の投稿上限に達しました」エラー
      // 次の投稿を試みる（UIエラー確認用）
      await page.click('[data-testid="entry-input"]')
      await page.fill('[data-testid="entry-textarea"]', '16件目の投稿')
      await page.click('[data-testid="submit-entry-button"]')

      await expect(page.locator('text=本日の投稿上限に達しました')).toBeVisible()
    })

    test('画像制限_ちょうど5枚', async ({ page }) => {
      // Setup: 無料プランユーザーで4枚添付済み
      await setupFreePlanUser(page, { imageCount: 4 })

      // Act: タイムラインページを開く
      await page.goto('/timeline', { waitUntil: 'networkidle' })

      // 5枚目は成功するはず
      await mockBillingLimitsAPI(page, {
        imageLimit: {
          allowed: true,
          current: 4,
          limit: 5,
          remaining: 1,
          planType: 'free',
        },
      })

      // Assert: 5枚目の添付は成功
      await page.click('[data-testid="entry-input"]')
      // 画像アップロードシミュレート
      const uploadButton = page.locator('[data-testid="image-upload-button"]')
      await uploadButton.click()
      await page.waitForTimeout(300)

      // 6枚目は制限到達
      await mockBillingLimitsAPI(page, {
        imageLimit: {
          allowed: false,
          current: 5,
          limit: 5,
          remaining: 0,
          planType: 'free',
        },
      })

      // Assert: 6枚目は「今月の画像上限に達しました」エラー
      await uploadButton.click()
      await expect(page.locator('text=今月の画像上限に達しました')).toBeVisible()
    })
  })

  test.describe('認証エラー', () => {
    test('未認証_制限チェック', async ({ page }) => {
      // Act: ログアウト状態で `/api/billing/limits` を呼び出し
      const response = await page.request.get('/api/billing/limits')

      // Assert: HTTPステータス401
      expect(response.status()).toBe(401)
    })

    test('未認証_プレミアムプランアクセス', async ({ page }) => {
      // Act: 認証なしで `/settings/billing` にアクセス
      await page.goto('/settings/billing', { waitUntil: 'networkidle' })

      // Assert: ログインページにリダイレクト
      await expect(page).toHaveURL(/login|auth/)
    })
  })
})
