# Implementation Plan

## Task Format

- [x] 完了済みタスク
- [ ] 未完了タスク
- [ ]* オプションタスク（テストカバレッジ）

---

## Tasks

- [x] 1. データベーススキーマとRPC関数の作成

- [x] 1.1 サブスクリプション管理テーブルの作成
  - subscriptionsテーブルを作成しStripe連携情報を管理する
  - user_idをUNIQUE制約で1ユーザー1サブスクリプションを保証
  - plan_type（free/premium_monthly/premium_yearly）とstatus管理
  - 期間情報（current_period_start/end、canceled_at）を保存
  - RLSポリシーでユーザー自身のデータのみアクセス可能に設定
  - Service roleポリシーでWebhook処理を許可
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.2 (P) ほつれ購入履歴テーブルの作成
  - hotsure_purchasesテーブルを作成し購入履歴を管理
  - stripe_payment_intent_idにUNIQUE制約で冪等性を保証
  - quantity（購入数量）とamount（金額）を記録
  - status管理（pending/completed/failed/refunded）
  - RLSポリシーでユーザー自身の履歴のみ参照可能に設定
  - _Requirements: 7.4_

- [x] 1.3 (P) ストリークテーブルにbonus_hotsureカラムを追加
  - streaksテーブルにbonus_hotsureカラムを追加
  - 購入分のほつれ残高を管理
  - デフォルト値0で既存データに影響なし
  - _Requirements: 7.3_

- [x] 1.4 (P) ほつれ購入可否チェックのRPC関数を作成
  - check_hotsure_purchase_allowed関数を作成
  - FOR UPDATEで競合状態を防止
  - 現在のほつれ残高（hotsure_remaining + bonus_hotsure）が2未満かを確認
  - 上限到達時はエラーメッセージを返却
  - _Requirements: 7.7_

- [x] 2. 型定義と定数の実装

- [x] 2.1 課金機能の型定義
  - PlanType型（free/premium_monthly/premium_yearly）を定義
  - Subscription、LimitStatus、LimitsResponse型を定義
  - BillingError型とエラーコードを定義
  - BillingResult型でResult型を拡張
  - _Requirements: 1.1, 6.7_

- [x] 2.2 (P) プラン定数とユーティリティ関数
  - PLAN_LIMITS定数で各プランの制限を定義（無料: 15投稿/日、5画像/月）
  - PLAN_INFO定数でUI表示用のプラン情報を定義
  - Stripe Price IDを環境変数から取得する定数を定義
  - isPremiumPlan、getPlanTypeFromPriceId等のヘルパー関数を実装
  - _Requirements: 6.1, 6.3_

- [x] 3. サブスクリプション管理サービスの実装

- [x] 3.1 サブスクリプション情報取得機能
  - getSubscription関数でユーザーのサブスクリプション情報を取得
  - getUserPlanType関数でプランタイプを判定
  - キャンセル済みでも期間内なら有効と判定
  - 認証チェックを実施しUNAUTHORIZEDエラーを返却
  - _Requirements: 1.1, 1.5, 8.1, 8.2_

- [x] 3.2 (P) 初期サブスクリプション作成機能
  - createInitialSubscription関数で無料プランレコードを作成
  - Stripe Customer ID作成時にupsertで保存
  - 認証チェックとエラーハンドリングを実施
  - _Requirements: 3.1, 3.2_

- [x] 4. 使用制限管理サービスの実装

- [x] 4.1 投稿制限チェック機能
  - checkEntryLimit関数でプラン別の投稿制限をチェック
  - JST基準で日次境界を計算（0:00リセット）
  - 無料プランは15件まで、プレミアムは無制限を返却
  - 現在の使用数、上限、残数を含むレスポンスを生成
  - _Requirements: 6.1, 6.2, 6.5, 6.6_

- [x] 4.2 (P) 画像制限チェック機能
  - checkImageLimit関数でプラン別の画像添付制限をチェック
  - JST基準で月次境界を計算（月初リセット）
  - 無料プランは5枚まで、プレミアムは無制限を返却
  - 画像添付済みエントリ数をカウント
  - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 4.3 プラン制限情報取得API
  - getPlanLimits関数で統合的な制限情報を取得
  - サブスクリプション情報、投稿制限、画像制限、ほつれ残高を並列取得
  - GET /api/billing/limits エンドポイントを実装
  - 認証チェックと適切なエラーレスポンスを返却
  - _Requirements: 6.7, 1.2, 1.3, 1.4, 7.8_

- [x] 5. Stripe Checkout統合の実装

- [x] 5.1 サブスクリプション用Checkout Session作成
  - createCheckoutSession Server Actionを実装
  - 認証チェックと既存プレミアム加入確認
  - Stripe Customerがなければ新規作成しDBに保存
  - メタデータにuser_idとplan_typeを含める
  - 成功/キャンセル時のリダイレクトURLを設定
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5.2 (P) ほつれ購入用Checkout Session作成
  - createHotsureCheckoutSession Server Actionを実装
  - RPC関数でほつれ残高をチェック（FOR UPDATEロック）
  - 単発決済モード（mode: 'payment'）でセッション作成
  - メタデータにtype: 'hotsure_purchase'と数量を含める
  - payment_intent_dataにもメタデータを設定
  - _Requirements: 7.1, 7.2, 7.5, 7.6, 7.7_

- [x] 5.3 (P) Customer Portal Session作成
  - createPortalSession Server Actionを実装
  - 既存のstripe_customer_idを取得してPortalセッション作成
  - 顧客情報がない場合はエラーを返却
  - return_urlをアプリのsocialページに設定
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Webhook Handler実装

- [x] 6.1 Webhook署名検証とルーティング
  - POST /api/webhooks/stripe エンドポイントを実装
  - Stripe署名を検証し不正リクエストを拒否
  - イベントタイプ別にハンドラーを分岐
  - 未対応イベントは無視してログ記録
  - _Requirements: 5.6, 5.7_

- [x] 6.2 サブスクリプションイベント処理
  - checkout.session.completed: サブスクリプション作成・更新
  - customer.subscription.updated: ステータス・期間更新
  - customer.subscription.deleted: 無料プランへ戻す
  - invoice.payment_failed: 支払い失敗をログ記録
  - AdminClientでRLSをバイパスして更新
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6.3 (P) ほつれ購入イベント処理
  - payment_intent.succeeded（type=hotsure_purchase）を処理
  - 購入履歴をhotsure_purchasesに作成
  - UNIQUE制約違反時は冪等性による重複処理として成功扱い
  - bonus_hotsureを加算
  - 金額と数量の整合性を検証
  - _Requirements: 5.5, 7.3, 7.4_

- [x] 7. エラーハンドリングの実装

- [x] 7.1 安全なエラー変換機能
  - createSafeBillingError関数を実装
  - 内部エラーはloggerで記録しユーザーには汎用メッセージを返却
  - エラーコード別のユーザー向けメッセージを定義
  - wrapUnknownBillingError関数で未知のエラーをラップ
  - _Requirements: 8.3, 8.4_

- [x] 7.2 (P) 認証チェック共通化
  - 全Server ActionsでauthActionClientを使用
  - 未認証時はUNAUTHORIZEDエラーを返却
  - 環境変数から価格IDを取得し未設定時はエラー
  - _Requirements: 8.1, 8.2, 8.6, 8.7_

- [x] 8. フロントエンドUIの実装

- [x] 8.1 usePlanLimitsフック
  - TanStack Queryで/api/billing/limitsをフェッチ
  - staleTime 5分、gcTime 10分でキャッシュ
  - プラン情報、制限状況、ほつれ残高を返却
  - canPurchaseHotsure判定を計算
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 8.2 BillingSectionコンポーネント
  - 現在のプランタイプをバッジで表示
  - 無料プランは投稿残数・画像残数を表示
  - プレミアムは無制限表示とサブスクリプション管理ボタン
  - キャンセル済み期限表示
  - ほつれ購入セクション（残高表示、購入可否制御）
  - アップグレードへのリンクボタン
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.8_

- [x] 8.3 (P) プラン選択ページ
  - PlanSelectionコンポーネントを実装
  - 月額・年額プランカードを並べて表示
  - 年額に「おすすめ」バッジを付与
  - Checkout遷移中のローディング状態管理
  - エラー表示とリトライ
  - 設定に戻るボタン
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 8.4 (P) PlanCardコンポーネント
  - プラン名、価格、機能一覧を表示
  - 年額プランの割引率（約27%お得）を表示
  - recommendedフラグでスタイル変更
  - 選択ボタンとdisabled状態の制御
  - _Requirements: 2.2, 2.3_

- [x] 8.5 (P) PlansHeaderコンポーネント
  - プラン選択ページ用のヘッダー
  - ロゴとタイトルを表示
  - SocialHeaderと同じ構成で統一感を維持
  - _Requirements: 2.1_

- [ ]* 9. テストの実装

- [ ]* 9.1 ユニットテスト
  - getPlanTypeFromPriceId: 有効なprice ID、無効なID、null
  - isValidHotsurePurchase: 正常金額、不正金額
  - isPremiumPlan: free/premium_monthly/premium_yearly
  - getUserPlanType: active/canceled/expired
  - _Requirements: 8.1_

- [ ]* 9.2 (P) サービス統合テスト
  - checkEntryLimit: 制限内、制限到達、プレミアム無制限
  - checkImageLimit: 月初、月末、境界値
  - Webhook handler: checkout完了、subscription更新、ほつれ購入
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 9.3 E2Eテスト
  - プラン表示: 無料/プレミアム表示切り替え
  - プラン選択ページ: カード表示、Checkout遷移（モック）
  - ほつれ購入: 購入可能/上限時のUI状態
  - キャンセル済み表示: 期限表示の確認
  - レスポンシブデザイン: モバイル/タブレット/デスクトップ
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.8_

---

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 3.1, 8.2 |
| 1.2 | 8.1, 8.2 |
| 1.3 | 8.1, 8.2 |
| 1.4 | 8.1, 8.2 |
| 1.5 | 3.1, 8.2 |
| 2.1 | 8.3, 8.5 |
| 2.2 | 8.3, 8.4 |
| 2.3 | 8.3, 8.4 |
| 2.4 | 8.3 |
| 2.5 | 8.3 |
| 2.6 | 8.3 |
| 2.7 | 8.3 |
| 3.1 | 3.2, 5.1 |
| 3.2 | 3.2, 5.1 |
| 3.3 | 5.1 |
| 3.4 | 5.1 |
| 3.5 | 5.1 |
| 3.6 | 5.1 |
| 4.1 | 5.3 |
| 4.2 | 5.3 |
| 4.3 | 5.3 |
| 4.4 | 5.3 |
| 5.1 | 1.1, 6.2 |
| 5.2 | 1.1, 6.2 |
| 5.3 | 1.1, 6.2 |
| 5.4 | 6.2 |
| 5.5 | 6.3 |
| 5.6 | 6.1 |
| 5.7 | 6.1 |
| 6.1 | 4.1 |
| 6.2 | 4.1 |
| 6.3 | 4.2 |
| 6.4 | 4.2 |
| 6.5 | 4.1, 4.2 |
| 6.6 | 4.1, 4.2 |
| 6.7 | 4.3 |
| 7.1 | 5.2 |
| 7.2 | 5.2 |
| 7.3 | 1.3, 6.3 |
| 7.4 | 1.2, 6.3 |
| 7.5 | 5.2 |
| 7.6 | 5.2 |
| 7.7 | 1.4, 5.2 |
| 7.8 | 4.3, 8.2 |
| 8.1 | 3.1, 7.2 |
| 8.2 | 3.1, 7.2 |
| 8.3 | 7.1 |
| 8.4 | 7.1 |
| 8.5 | 6.1 |
| 8.6 | 7.2 |
| 8.7 | 7.2 |

---

## Summary

- **Total**: 9 major tasks, 21 sub-tasks
- **Completed**: 8 major tasks, 18 sub-tasks (100% implementation complete)
- **Optional (Test Coverage)**: 3 sub-tasks
- **All 48 acceptance criteria covered**
- **Average task size**: 1-3 hours per sub-task

### Implementation Status

billing機能は完全に実装済みです。以下のコンポーネントが稼働中:

- **Database**: subscriptions, hotsure_purchases, check_hotsure_purchase_allowed RPC
- **API Services**: CheckoutService, PortalService, SubscriptionService, PlanLimitsService
- **Webhook Handler**: 全Stripeイベント対応（冪等性対策済み）
- **UI Components**: BillingSection, PlanSelection, PlanCard, PlansHeader
- **Hook**: usePlanLimits (TanStack Query)
- **Error Handling**: createSafeBillingError, logger統合

### Remaining Work

オプションとしてテストカバレッジの追加を推奨:
- ユニットテスト: constants.tsのヘルパー関数
- 統合テスト: 制限チェック、Webhook処理
- E2Eテスト: e2e/plans/billing.plan.mdに基づく34テストケース
