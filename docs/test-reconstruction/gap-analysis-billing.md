# ギャップ分析レポート: billing

## 概要

| 項目 | 状況 |
|------|------|
| 仕様書 | `.kiro/specs/billing/requirements.md`, `design.md`, `tasks.md` |
| 実装 | `src/features/billing/` |
| 分析日 | 2026-01-17 |

## ギャップ一覧

### 1. テスト未実装

| 項目 | 内容 |
|------|------|
| 仕様 | ユニットテスト・E2Eテスト |
| 実装 | 未実装（削除済み） |
| 優先度 | 高 |
| 影響 | 品質保証、決済機能の安全性 |

### 2. ほつれパック数量デフォルト値の軽微な不一致

| 項目 | 内容 |
|------|------|
| 仕様 | デフォルト数量の明示なし |
| 実装 | 特定のデフォルト値が設定されている |
| 優先度 | 低 |
| 影響 | 軽微 |

**関連ファイル**: `src/features/billing/constants.ts`

**対応案**: 仕様書にデフォルト値を明記

## 実装状況

| 機能 | 状況 |
|------|------|
| Stripe Checkout | ✅ 実装済み |
| Webhook処理 | ✅ 実装済み |
| プラン制限管理 | ✅ 実装済み |
| ほつれパック購入 | ✅ 実装済み |
| Customer Portal | ✅ 実装済み |
| 冪等性処理 | ✅ 実装済み |

## 仕様書更新の必要性

| 項目 | 更新内容 |
|------|---------|
| デフォルト値 | ほつれパック数量のデフォルト値を明記 |

## テスト観点

### ユニットテスト

- [ ] `service.ts`: プラン取得、制限チェック
- [ ] `stripe.ts`: Checkout Session作成
- [ ] `webhook.ts`: イベント処理、冪等性
- [ ] プラン別制限値の検証
- [ ] ほつれパック購入ロジック

### E2Eテスト

- [ ] プラン選択画面表示
- [ ] Checkoutフロー（Stripe Test Mode）
- [ ] プラン変更フロー
- [ ] Customer Portal遷移
- [ ] ほつれパック購入フロー

### Webhook テスト（統合テスト）

- [ ] `checkout.session.completed`
- [ ] `customer.subscription.updated`
- [ ] `customer.subscription.deleted`
- [ ] `invoice.payment_succeeded`
- [ ] `invoice.payment_failed`
- [ ] 重複イベントの冪等性

## 結論

billing機能は**仕様と実装がほぼ一致**しており、ギャップは軽微。テスト再構築が主な作業となる。決済機能のため、Webhookの冪等性テストを重点的に実施する。

## テスト環境設定

```env
# .env.test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

```bash
# Stripe CLI でローカルWebhookテスト
stripe listen --forward-to localhost:3000/api/billing/webhook
```
