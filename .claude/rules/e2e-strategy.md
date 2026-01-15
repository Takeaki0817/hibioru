---
paths: e2e/**/*.ts, playwright.config.ts
---

# E2Eテスト戦略

## テスト分類

| カテゴリ | ファイル例 | 実行タイミング |
|---------|-----------|---------------|
| **Smoke** | auth.spec.ts | 毎PR |
| **Critical Path** | entry-input.spec.ts, billing-checkout.spec.ts | 毎PR |
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
```typescript
import { setupTestSession, TEST_USERS } from './fixtures/test-helpers'

test.beforeEach(async ({ page }) => {
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

| ファイル | 用途 |
|---------|------|
| `test-helpers.ts` | 認証、タイムライン、ドラフト操作 |
| `stripe-helpers.ts` | Stripe webhook、DB検証 |

## Flaky テスト対策

1. **タイムアウト調整**: `test.setTimeout(60000)` で個別延長
2. **waitFor使用**: `waitForApiResponse()` でネットワーク待機
3. **リトライ設定**: CI環境では `retries: 2`

## 追加時のガイドライン

1. 機能単位で `{feature}.spec.ts` 作成
2. エッジケースは `{feature}-edge-cases.spec.ts` に分離
3. `test.skip()` で認証必須を明示
4. `test-helpers.ts` の既存ヘルパーを活用
