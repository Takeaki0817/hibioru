# Requirements Document

## Introduction

ヒビオル（hibioru）の課金機能の要件を定義する。本機能は、無料プランとプレミアムプラン（月額/年額）の提供、使用制限の管理、ほつれパックの単発購入、およびStripeを通じた決済処理を実現する。

ADHDユーザー向けアプリの設計原則「無料で十分使えることを維持（課金圧を強くしない）」に基づき、無料プランでも基本機能は十分に利用可能とする。

### プラン構成

| プラン | 価格 | 投稿制限 | 画像制限 |
|--------|------|----------|----------|
| 無料プラン | 0円 | 1日15件 | 月5枚 |
| プレミアム月額 | 480円/月 | 無制限 | 無制限 |
| プレミアム年額 | 4,200円/年 | 無制限 | 無制限（約27%お得） |

### ほつれパック

| 商品 | 価格 | 内容 | 上限 |
|------|------|------|------|
| ほつれパック | 120円 | ほつれ1回分 | 合計2個まで |

## Requirements

### Requirement 1: プラン表示と現在のプラン状態

**Objective:** As a ユーザー, I want 現在のプランと使用状況を確認できること, so that 自分の利用制限を把握できる

#### Acceptance Criteria

1. When ユーザーが設定画面を表示した場合, the Billing Service shall 現在のプランタイプ（無料/プレミアム月額/プレミアム年額）を表示する
2. While ユーザーが無料プランを利用中の場合, the Billing Service shall 本日の投稿残数（15件中X件）を表示する
3. While ユーザーが無料プランを利用中の場合, the Billing Service shall 今月の画像添付残数（5枚中X枚）を表示する
4. While ユーザーがプレミアムプランを利用中の場合, the Billing Service shall 投稿数・画像添付数を「無制限」と表示する
5. When サブスクリプションがキャンセル済みで期限内の場合, the Billing Service shall 現在の有効期限日を表示する

### Requirement 2: プラン選択ページ

**Objective:** As a ユーザー, I want プラン詳細を比較して選択できること, so that 自分に適したプランを選べる

#### Acceptance Criteria

1. When ユーザーが `/social/plans` にアクセスした場合, the Plans Page shall 月額・年額プランのカードを並べて表示する
2. The Plans Page shall 各プランの価格、機能一覧、割引率（年額のみ）を表示する
3. The Plans Page shall 年額プランに「おすすめ」バッジを表示する
4. When ユーザーがプランカードの選択ボタンをクリックした場合, the Billing Service shall Stripe Checkoutセッションを作成してリダイレクトする
5. While Checkout処理中の場合, the Plans Page shall ローディング状態を表示してボタンを無効化する
6. If Checkoutセッション作成に失敗した場合, then the Plans Page shall エラーメッセージを表示する
7. When ユーザーが「設定に戻る」ボタンをクリックした場合, the Plans Page shall `/social` に遷移する

### Requirement 3: Stripe Checkout統合

**Objective:** As a ユーザー, I want 安全に決済を完了できること, so that プレミアムプランに加入できる

#### Acceptance Criteria

1. When Checkoutセッション作成時にStripe顧客が存在しない場合, the Checkout Service shall 新規Stripe顧客を作成してサブスクリプションテーブルに保存する
2. When Checkoutセッション作成時にStripe顧客が既に存在する場合, the Checkout Service shall 既存の顧客IDを使用する
3. If ユーザーが既にプレミアムプランに加入している場合, then the Checkout Service shall エラー「既にプレミアムプランに加入しています」を返す
4. When 決済が成功した場合, the Checkout Service shall `/social?checkout=success` にリダイレクトする
5. When ユーザーが決済をキャンセルした場合, the Checkout Service shall `/social?checkout=canceled` にリダイレクトする
6. The Checkout Service shall StripeセッションのメタデータにユーザーIDとプランタイプを含める

### Requirement 4: Stripe Customer Portal

**Objective:** As a プレミアムユーザー, I want サブスクリプションを管理できること, so that プラン変更やキャンセルができる

#### Acceptance Criteria

1. When プレミアムユーザーがサブスクリプション管理ボタンをクリックした場合, the Portal Service shall Stripe Customer Portalセッションを作成してリダイレクトする
2. If Stripe顧客情報が見つからない場合, then the Portal Service shall エラー「Stripe顧客情報が見つかりません」を返す
3. When ユーザーがポータルを閉じた場合, the Portal Service shall `/social` に戻る
4. The Customer Portal shall プラン変更、支払い方法更新、サブスクリプションキャンセルの機能を提供する

### Requirement 5: Webhook処理

**Objective:** As a システム管理者, I want Stripeイベントを正確に処理すること, so that サブスクリプション状態を同期できる

#### Acceptance Criteria

1. When `checkout.session.completed` イベントを受信した場合, the Webhook Handler shall サブスクリプションテーブルを更新してプランタイプ、ステータス、期間情報を保存する
2. When `customer.subscription.updated` イベントを受信した場合, the Webhook Handler shall ステータス、期間開始日、期間終了日、キャンセル日を更新する
3. When `customer.subscription.deleted` イベントを受信した場合, the Webhook Handler shall プランタイプを「free」に戻しステータスを「canceled」に更新する
4. When `invoice.payment_failed` イベントを受信した場合, the Webhook Handler shall 支払い失敗をログに記録する
5. When `payment_intent.succeeded` イベントをほつれ購入として受信した場合, the Webhook Handler shall bonus_hotsureを加算して購入履歴を作成する
6. If Webhook署名の検証に失敗した場合, then the Webhook Handler shall HTTPステータス400を返す
7. The Webhook Handler shall 未対応のイベントタイプは無視してログに記録する

### Requirement 6: 使用制限管理

**Objective:** As a システム, I want プランに応じた使用制限を適用すること, so that 公平なサービス提供ができる

#### Acceptance Criteria

1. When 無料ユーザーがエントリを作成しようとした場合, the Plan Limits Service shall 本日の投稿数が15件未満かを確認する
2. If 無料ユーザーが本日の投稿上限（15件）に達した場合, then the Plan Limits Service shall 投稿を許可せず残数0を返す
3. When 無料ユーザーが画像を添付しようとした場合, the Plan Limits Service shall 今月の画像添付数が5枚未満かを確認する
4. If 無料ユーザーが今月の画像上限（5枚）に達した場合, then the Plan Limits Service shall 画像添付を許可せず残数0を返す
5. While ユーザーがプレミアムプランを利用中の場合, the Plan Limits Service shall 投稿数・画像添付数の制限チェックをスキップして常に許可を返す
6. The Plan Limits Service shall 日次制限はJST 0:00でリセットし、月次制限はJST月初でリセットする
7. When 制限チェックAPIが呼ばれた場合, the Plan Limits Service shall プランタイプ、現在の使用数、上限、残数を含むレスポンスを返す

### Requirement 7: ほつれパック購入

**Objective:** As a ユーザー, I want ほつれを追加購入できること, so that ストリークを維持する手段を増やせる

#### Acceptance Criteria

1. When ユーザーがほつれパック購入ボタンをクリックした場合, the Checkout Service shall 単発決済モードでStripe Checkoutセッションを作成する
2. When ほつれ購入のCheckoutセッションを作成した場合, the Checkout Service shall メタデータに購入タイプ「hotsure_purchase」と数量を含める
3. When ほつれ購入の決済が成功した場合, the Webhook Handler shall ユーザーのbonus_hotsureに1を加算する
4. When ほつれ購入の決済が成功した場合, the Webhook Handler shall hotsure_purchasesテーブルに購入履歴を作成する
5. When ほつれ購入が成功した場合, the Checkout Service shall `/social?hotsure_purchase=success` にリダイレクトする
6. When ユーザーがほつれ購入をキャンセルした場合, the Checkout Service shall `/social?hotsure_purchase=canceled` にリダイレクトする
7. If ユーザーのほつれ残高（hotsure_remaining + bonus_hotsure）が2以上の場合, then the Checkout Service shall エラー「ほつれは2個以上持てません」を返す
8. The Billing Section shall 現在のほつれ残高と購入可否を表示し、上限時はボタンを無効化する

### Requirement 8: エラーハンドリングとセキュリティ

**Objective:** As a システム, I want 安全で信頼性の高い課金処理を提供すること, so that ユーザーデータと決済情報を保護できる

#### Acceptance Criteria

1. The Billing Service shall すべてのServer Actionで認証チェックを実行する
2. If ユーザーが未認証の場合, then the Billing Service shall エラーコード「UNAUTHORIZED」を返す
3. The Billing Service shall 内部エラーの詳細をユーザーに露出せず汎用メッセージを返す
4. The Billing Service shall エラー発生時にloggerを使用して内部ログに記録する
5. The Webhook Handler shall Stripe署名を検証して不正なリクエストを拒否する
6. The Billing Service shall 環境変数からStripe APIキーと価格IDを取得する
7. If Stripe価格IDが設定されていない場合, then the Checkout Service shall エラー「価格IDが設定されていません」を返す
