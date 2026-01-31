---
globs: e2e/**/*.ts, playwright.config.ts
---

# E2Eテスト戦略

## テスト分類

| カテゴリ | ファイル例 | 実行タイミング |
|---------|-----------|---------------|
| **Smoke** | auth.spec.ts | 毎PR |
| **Critical Path** | entry.spec.ts, billing.spec.ts | 毎PR |
| **Regression** | *-advanced.spec.ts, *-edge-cases.spec.ts | リリース前 |

## 実行コマンド

```bash
# 全テスト
pnpm exec playwright test

# UIモード（デバッグ）
pnpm exec playwright test --ui

# 特定ファイル
pnpm exec playwright test auth

# CI用（リトライあり）
pnpm exec playwright test --retries=2
```

## テストパターン

### 認証セットアップ

Cookie認証バイパス方式を採用。`e2e-test-user-id` Cookieを設定することで、middleware.ts + e2e-auth.ts が認証をバイパスする。

```typescript
// TEST_USERS定数から許可されたユーザーIDを使用
import { setupTestSession, TEST_USERS } from './fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
  // Cookie認証バイパス: e2e-test-user-id Cookieを設定
  // middleware.ts + e2e-auth.ts で処理される
  await setupTestSession(page, TEST_USERS.PRIMARY.id)
})
```

### APIモック
```typescript
await page.route('/api/billing/limits', route =>
  route.fulfill({ json: { plan: 'premium', hotsure_remaining: 10 } })
)
```

### 無限スクロール
```typescript
await scrollToLoadMore(page)
await expect(page.locator('[data-testid="entry-card"]')).toHaveCount(20)
```

## フィクスチャ

### test-helpers.ts

| カテゴリ | 関数 | 用途 |
|---------|------|------|
| **定数** | `TEST_USERS` | PRIMARY/SECONDARY テストユーザー |
| **定数** | `BILLING_TEST_USERS` | free/premium/canceled ユーザー |
| **認証** | `setupTestSession(page, userId?)` | Cookie認証バイパス設定 |
| **認証** | `setupAuthenticatedPage(page, url)` | 認証済みページ遷移 |
| **下書き** | `setDraftContent(page, content)` | localStorage下書き設定 |
| **下書き** | `clearDraftContent(page)` | 下書きクリア |
| **待機** | `waitForPageLoad(page)` | ページ読み込み完了 |
| **待機** | `waitForTimelineLoad(page)` | タイムライン読み込み |
| **待機** | `waitForApiResponse(page, url)` | API応答待機（Flaky対策） |
| **待機** | `waitForElement(page, selector)` | 要素表示待機 |
| **Billing** | `mockBillingLimitsAPI(page, response)` | 制限APIモック |
| **Billing** | `setupFreePlanUser(page)` | 無料プランユーザー設定 |
| **Billing** | `setupPremiumPlanUser(page)` | プレミアムユーザー設定 |
| **Stripe** | `interceptStripeCheckout(page)` | Checkout リダイレクト捕捉 |
| **Stripe** | `interceptStripePortal(page)` | Portal リダイレクト捕捉 |

### stripe-helpers.ts

| 関数 | 用途 |
|------|------|
| DB検証用ヘルパー | Subscription状態、Bonus確認 |
| Webhookテスト用 | イベントシミュレーション |

## Flaky テスト対策

1. **タイムアウト調整**: `test.setTimeout(60000)` で個別延長
2. **waitFor使用**: `waitForApiResponse()` でネットワーク待機
3. **リトライ設定**: CI環境では `retries: 2`

## 追加時のガイドライン

1. 機能単位で `{feature}.spec.ts` 作成
2. エッジケースは `{feature}-edge-cases.spec.ts` に分離
3. `test.skip()` で認証必須を明示
4. `test-helpers.ts` の既存ヘルパーを活用
