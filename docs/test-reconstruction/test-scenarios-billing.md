# テストシナリオ: billing

## 概要

billing機能のテストシナリオ。Stripe統合、プラン制限管理、Webhook処理を重点的にカバー。特にWebhook冪等性テストを詳細化。

## ユニットテスト

### 関数ユーティリティ

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| getPlanTypeFromPriceId_有効なID | `getPlanTypeFromPriceId(priceId)` | 有効なprice IDから正しいプランタイプを返す | P0 |
| getPlanTypeFromPriceId_無効なID | `getPlanTypeFromPriceId(priceId)` | 無効なprice IDの場合nullを返す | P1 |
| getPlanTypeFromPriceId_空文字 | `getPlanTypeFromPriceId('')` | 空文字の場合nullを返す | P1 |
| isPremiumPlan_premium_monthly | `isPremiumPlan('premium_monthly')` | premium_monthlyの場合trueを返す | P0 |
| isPremiumPlan_premium_yearly | `isPremiumPlan('premium_yearly')` | premium_yearlyの場合trueを返す | P0 |
| isPremiumPlan_free | `isPremiumPlan('free')` | freeの場合falseを返す | P0 |
| isValidHotsurePurchase_正常金額 | `isValidHotsurePurchase(120, 1)` | 正しい金額（120 * 1）の場合trueを返す | P0 |
| isValidHotsurePurchase_複数個 | `isValidHotsurePurchase(240, 2)` | 複数個の場合も正しく判定 | P0 |
| isValidHotsurePurchase_不正金額 | `isValidHotsurePurchase(100, 1)` | 不正な金額の場合falseを返す | P0 |
| isValidHotsurePurchase_0円 | `isValidHotsurePurchase(0, 0)` | 0円の場合falseを返す | P1 |

### API関数

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| getSubscription_存在 | `getSubscription(userId)` | ユーザーのサブスクリプションが存在する場合、正しいデータを返す | P0 |
| getSubscription_存在しない | `getSubscription(userId)` | ユーザーのサブスクリプションが存在しない場合、nullを返す | P0 |
| getSubscription_認証なし | `getSubscription(userId)` | 異なるユーザーIDで呼び出した場合、UNAUTHORIZEDエラーを返す | P0 |
| getSubscription_DB障害 | `getSubscription(userId)` | DB障害時はDB_ERRORエラーを返す | P1 |
| getUserPlanType_active | `getUserPlanType(userId)` | ステータス'active'で'premium_monthly'の場合、'premium_monthly'を返す | P0 |
| getUserPlanType_canceled_有効期間内 | `getUserPlanType(userId)` | キャンセル済みでも有効期間内なら'premium_yearly'を返す | P0 |
| getUserPlanType_canceled_期間終了 | `getUserPlanType(userId)` | キャンセル済みで期間終了済みの場合、'free'を返す | P0 |
| getUserPlanType_free | `getUserPlanType(userId)` | plan_typeが'free'の場合、'free'を返す | P0 |
| getUserPlanType_レコード未作成 | `getUserPlanType(userId)` | レコードが存在しない場合、'free'を返す | P0 |
| createInitialSubscription_新規作成 | `createInitialSubscription(userId)` | 無料プランの初期レコードを作成 | P0 |
| createInitialSubscription_stripeCustomerId付き | `createInitialSubscription(userId, customerId)` | Stripe Customer IDを指定して作成 | P0 |
| createInitialSubscription_認証なし | `createInitialSubscription(userId)` | 異なるユーザーIDで呼び出した場合、UNAUTHORIZEDエラーを返す | P0 |

### 制限チェック関数

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| checkEntryLimit_プレミアム | `checkEntryLimit(userId)` | プレミアムユーザーの場合、allowed=true, limit=null, remaining=nullを返す | P0 |
| checkEntryLimit_無料_制限内 | `checkEntryLimit(userId)` | 無料プランで制限内（10/15件）の場合、allowed=true, remaining=5を返す | P0 |
| checkEntryLimit_無料_制限到達 | `checkEntryLimit(userId)` | 無料プランで制限に到達（15/15件）の場合、allowed=false, remaining=0を返す | P0 |
| checkEntryLimit_無料_JST境界 | `checkEntryLimit(userId)` | JST 0:00での日次リセットが正しく機能 | P0 |
| checkEntryLimit_DB障害 | `checkEntryLimit(userId)` | DB障害時はDB_ERRORエラーを返す | P1 |
| checkImageLimit_プレミアム | `checkImageLimit(userId)` | プレミアムユーザーの場合、allowed=true, limit=null, remaining=nullを返す | P0 |
| checkImageLimit_無料_制限内 | `checkImageLimit(userId)` | 無料プランで制限内（2/5枚）の場合、allowed=true, remaining=3を返す | P0 |
| checkImageLimit_無料_制限到達 | `checkImageLimit(userId)` | 無料プランで制限に到達（5/5枚）の場合、allowed=false, remaining=0を返す | P0 |
| checkImageLimit_無料_月初リセット | `checkImageLimit(userId)` | JST月初での月次リセットが正しく機能 | P0 |
| checkImageLimit_DB障害 | `checkImageLimit(userId)` | DB障害時はDB_ERRORエラーを返す | P1 |
| getPlanLimits_全情報取得 | `getPlanLimits(userId)` | entryLimit, imageLimit, canceledAt, currentPeriodEnd, ほつれ残高を全て返す | P0 |

### Webhook署名検証

| テスト名 | 対象 | テスト内容 | 優先度 |
|---------|------|-----------|--------|
| 署名検証_有効 | Webhook POST | 有効なStripe署名でイベントを受け入れる | P0 |
| 署名検証_無効 | Webhook POST | 無効な署名でHTTPステータス400を返す | P0 |
| 署名検証_なし | Webhook POST | 署名ヘッダーなしでHTTPステータス400を返す | P0 |

### エラー処理

| テスト名 | 対象 | テスト内容 | 優先度 |
|---------|------|-----------|--------|
| エラー変換_UNAUTHORIZED | `createSafeBillingError('UNAUTHORIZED')` | ユーザーフレンドリーなエラーメッセージを返す | P0 |
| エラー変換_STRIPE_ERROR | `createSafeBillingError('STRIPE_ERROR')` | 内部エラーを隠蔽し汎用メッセージを返す | P0 |
| エラー変換_DB_ERROR | `createSafeBillingError('DB_ERROR')` | DB詳細を隠蔽し汎用メッセージを返す | P0 |
| エラー変換_ロギング | `createSafeBillingError('DB_ERROR', error)` | 内部エラー引数でloggerに記録される | P0 |

## E2Eテスト

### 正常系

#### 1. 無料プランのプロフィール表示

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| 無料プラン表示 | 1. ユーザーがログイン<br/>2. 設定 > 課金タブを開く | 1. プランが「無料プラン」と表示<br/>2. 本日の投稿残数（15中X）を表示<br/>3. 今月の画像残数（5中X）を表示<br/>4. 「プランをアップグレード」ボタンが表示 | P0 |
| 無料プラン投稿制限 | 1. 無料プランユーザーが投稿数制限の確認<br/>2. 本日の投稿を14件作成<br/>3. 15件目の投稿をしようとする | 1. 14件目まで投稿可能<br/>2. 15件目の投稿は「本日の投稿上限に達しました」とエラー表示 | P0 |
| 無料プラン画像制限 | 1. 無料プランユーザーが画像数制限の確認<br/>2. 今月の画像を4枚添付<br/>3. 5枚目を添付しようとする | 1. 4枚目まで添付可能<br/>2. 5枚目は「今月の画像上限に達しました」とエラー表示 | P0 |

#### 2. Stripe Checkout遷移

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| Checkout遷移_月額 | 1. 無料プランユーザーが設定から「プランアップグレード」<br/>2. プラン選択ページで月額プランを選択<br/>3. 「購入する」ボタンをクリック | 1. Stripe Test Mode チェックアウト画面に遷移<br/>2. 金額「480円/月」と表示<br/>3. キャンセルボタンで /social に戻る | P0 |
| Checkout遷移_年額 | 1. 無料プランユーザーが設定から「プランアップグレード」<br/>2. プラン選択ページで年額プランを選択<br/>3. 「購入する」ボタンをクリック | 1. Stripe Test Mode チェックアウト画面に遷移<br/>2. 金額「4,200円/年」と表示<br/>3. 年額プランに「おすすめ」バッジが表示 | P0 |
| Checkout中のローディング | 1. プラン選択ページで「購入する」をクリック<br/>2. ローディング中に別ボタンをクリック | 1. クリック中はボタンが disabled<br/>2. ローディング表示（spinner）が表示 | P0 |
| Checkout_既にプレミアム | 1. プレミアムユーザーが設定から「プランアップグレード」<br/>2. プラン選択ページにアクセス | 1. ボタンが disabled<br/>2. 「既にプレミアムプランに加入しています」メッセージ表示 | P0 |

#### 3. Webhook: checkout.session.completed

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| サブスク作成_月額 | 1. Stripe Test Cardで月額プランの決済完了<br/>2. Webhook `checkout.session.completed` 受信 | 1. subscriptionsテーブル upsert<br/>   - plan_type = 'premium_monthly'<br/>   - status = 'active'<br/>   - stripe_customer_id, stripe_subscription_id, stripe_price_id 保存<br/>   - current_period_start, current_period_end 保存 | P0 |
| サブスク作成_年額 | 1. Stripe Test Cardで年額プランの決済完了<br/>2. Webhook `checkout.session.completed` 受信 | 1. subscriptionsテーブル upsert<br/>   - plan_type = 'premium_yearly'<br/>   - status = 'active'<br/>   - 期間情報正確に保存 | P0 |
| Webhook_既存カスタマーの更新 | 1. stripe_customer_id が既に存在する状態で<br/>2. Webhook `checkout.session.completed` 受信 | 1. subscriptionsテーブル update<br/>   - plan_type, stripe_subscription_id, stripe_price_id を更新 | P0 |

#### 4. プレミアムプランのプロフィール表示

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| プレミアム表示 | 1. プレミアムユーザーが設定 > 課金タブを開く<br/>2. Webhook実行済み | 1. プランが「プレミアム（月額）」または「プレミアム（年額）」と表示<br/>2. 投稿数「無制限」と表示<br/>3. 画像添付「無制限」と表示 | P0 |
| プレミアム_投稿制限なし | 1. プレミアムユーザーが投稿<br/>2. 30件投稿 | 1. すべての投稿が成功<br/>2. エラー表示なし | P0 |
| プレミアム_画像制限なし | 1. プレミアムユーザーが画像添付<br/>2. 20枚添付 | 1. すべての添付が成功<br/>2. エラー表示なし | P0 |
| 有効期限表示_キャンセル済み | 1. プレミアムユーザーがCustomer Portalで解約<br/>2. Webhook `customer.subscription.deleted` 実行<br/>3. ただし current_period_end は未来 | 1. プランが「プレミアム（月額）」で表示<br/>2. 「有効期限: 2026-02-17」と表示 | P0 |

#### 5. Customer Portal遷移

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| Portal遷移 | 1. プレミアムユーザーが設定 > 課金<br/>2. 「サブスクリプション管理」ボタンをクリック | 1. Stripe Customer Portal に遷移<br/>2. プラン変更、支払い方法更新、キャンセルが可能 | P0 |
| Portal_顧客未発見 | 1. 異常な状態で stripe_customer_id が null<br/>2. 「サブスクリプション管理」をクリック | 1. エラーメッセージ「顧客情報が見つかりません」表示 | P0 |

#### 6. ほつれパック購入

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| ほつれ購入_表示 | 1. ユーザーがホーム画面を表示<br/>2. ほつれ残高が 0 | 1. 「ほつれパック（120円）」ボタンが表示<br/>2. ボタンが enabled | P0 |
| ほつれ購入_ボタン有効化 | 1. ほつれ残高が 1 未満 | 1. 「ほつれパックを購入」ボタンが enabled | P0 |
| ほつれ購入_ボタン無効化 | 1. ほつれ残高（remaining + bonus）が 2 以上<br/>2. ホーム画面を表示 | 1. 「ほつれパックを購入」ボタンが disabled<br/>2. 「ほつれは2個以上持てません」表示 | P0 |
| ほつれ決済 | 1. ほつれ残高 0 でボタン有効<br/>2. 「ほつれパックを購入」をクリック<br/>3. Stripe Checkoutで120円を決済 | 1. Checkout画面に遷移（mode=payment）<br/>2. `/social?hotsure_purchase=success` にリダイレクト | P0 |
| ほつれ決済キャンセル | 1. Checkoutを開いてキャンセル | 1. `/social?hotsure_purchase=canceled` にリダイレクト | P0 |

### 異常系

#### 1. Stripe エラーハンドリング

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| Stripe障害_Checkout失敗 | 1. Stripe APIが一時的に障害中<br/>2. 「購入する」をクリック | 1. エラーメッセージ「決済処理中にエラーが発生しました。しばらく後にお試しください」<br/>2. ボタンは再度クリック可能 | P0 |
| 価格ID未設定 | 1. 環境変数にSTRIPE_PRICE_*が未設定<br/>2. 「購入する」をクリック | 1. エラーメッセージ「価格情報の取得に失敗しました」 | P0 |

#### 2. 制限チェックのエッジケース

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| 投稿制限_ちょうど15件 | 1. 本日14件投稿<br/>2. 15件目を投稿 | 1. 15件目の投稿は成功<br/>2. 16件目は「本日の投稿上限に達しました」エラー | P0 |
| 画像制限_ちょうど5枚 | 1. 今月4枚添付<br/>2. 5枚目を添付 | 1. 5枚目の添付は成功<br/>2. 6枚目は「今月の画像上限に達しました」エラー | P0 |
| 日次リセット_JST境界 | 1. JST 23:59:59に投稿<br/>2. JST 00:00:01に投稿<br/>3. 両日とも制限カウント確認 | 1. 日次制限がJST 00:00で正しくリセット<br/>2. 各日で独立したカウント | P0 |
| 月次リセット_JST月初 | 1. 2月28日に画像2枚添付<br/>2. 3月1日に画像確認 | 1. 月次制限がJST月初で正しくリセット<br/>2. 3月は5枚から開始 | P0 |

#### 3. 認証エラー

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| 未認証_Checkout | 1. ログアウト状態で Checkout API呼び出し | 1. HTTPステータス401<br/>2. エラーコード「UNAUTHORIZED」 | P0 |
| 未認証_制限チェック | 1. ログアウト状態で `/api/billing/limits` 呼び出し | 1. HTTPステータス401 | P0 |
| 認証ユーザー異なる | 1. User A が getSubscription(User B ID) を呼び出し | 1. エラーコード「UNAUTHORIZED」 | P0 |

## Webhookテスト（統合テスト）

### 冪等性テスト

#### 1. checkout.session.completed の重複受信

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| 重複処理_月額 | 同一の `checkout.session.completed` を2回受信 | 1回目でupsert実行<br/>2回目で同じイベントを再送 | 1. subscriptionsテーブルは1レコードのまま<br/>2. 2回目で上書き（値は同じ）<br/>3. ログに「重複処理」記録 | P0 |
| 重複処理_customer_id競合 | stripe_customer_idが異なる2つのcheckout完了 | 2つの異なる顧客が同時に購入 | 1. 各ユーザーで異なるstripe_customer_idで保存<br/>2. 競合状態なし | P1 |

#### 2. customer.subscription.updated

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| 重複処理_subscription_updated | 同一の `customer.subscription.updated` を2回受信 | 1回目で更新実行<br/>2回目で再送 | 1. subscriptionsテーブルはstatus, current_period_start, current_period_end を更新<br/>2. 2回目で同じ値を上書き<br/>3. ログに記録 | P0 |
| subscription_updated_ステータス変更 | subscription.status が 'active' → 'past_due' | Webhook受信とDBの同期 | 1. statusが'past_due'に更新<br/>2. plan_type, period情報は保持 | P0 |

#### 3. customer.subscription.deleted

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| 重複処理_subscription_deleted | 同一の `customer.subscription.deleted` を2回受信 | 1回目で削除実行<br/>2回目で再送 | 1. plan_type = 'free'<br/>2. status = 'canceled'<br/>3. 2回目で同じ値を上書き | P0 |
| subscription_deleted_期間内 | subscription.current_period_end が未来なのに削除イベント | ユーザーが解約した場合 | 1. plan_type = 'free'<br/>2. current_period_end は保持（有効期限表示用）<br/>3. ユーザーはまだプレミアム扱い（期限切れまで） | P0 |

#### 4. invoice.payment_failed

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| 支払い失敗_ログ記録 | `invoice.payment_failed` イベント | 支払い失敗を受信 | 1. logger.warnで記録<br/>2. DBには記録しない（既存subscriptionのままで支払い再試行待機） | P1 |
| 支払い失敗_重複処理 | 同一の `invoice.payment_failed` を2回受信 | 1回目で記録<br/>2回目で再送 | 1. ログに2回記録<br/>2. ビジネスロジックに影響なし | P1 |

#### 5. payment_intent.succeeded（ほつれ購入）

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| ほつれ購入_正常完了 | `payment_intent.succeeded` with metadata.type='hotsure_purchase' | ほつれパック120円の決済完了 | 1. hotsure_purchasesテーブルに INSERT<br/>   - stripe_payment_intent_id: 一意<br/>   - quantity: 1<br/>   - amount: 120<br/>   - status: 'completed'<br/>2. streaks.bonus_hotsure を +1<br/>3. ログに記録 | P0 |
| ほつれ購入_冪等性_UNIQUE制約 | 同一payment_intent_idの `payment_intent.succeeded` を2回受信 | stripe_payment_intent_id UNIQUE制約で冪等性保証 | 1. hotsure_purchasesテーブルは1レコード<br/>2. 2回目のINSERT は constraint error でスキップ<br/>3. ログで「重複処理」と記録<br/>4. streaks.bonus_hotsure は1度だけ加算（トランザクション内） | P0 |
| ほつれ購入_金額検証_120円 | payment_intent.amount = 120, quantity = 1 | 正しい金額 | 1. amount計算 120 * 1 = 120<br/>2. isValidHotsurePurchase = true<br/>3. DB保存 | P0 |
| ほつれ購入_金額検証_不正金額 | payment_intent.amount = 100, quantity = 1 | 不正な金額 | 1. isValidHotsurePurchase = false<br/>2. logger.error で記録<br/>3. DB保存しない | P0 |
| ほつれ購入_重複処理_タイムシフト | 1回目のpayment_intentでhotsure_purchase完了<br/>1時間後に同じpayment_intentでWebhook再送 | トランザクション間での重複 | 1. 1回目: hotsure_purchases INSERT + bonus_hotsure +1<br/>2. 2回目: INSERT constraint error で失敗<br/>3. bonus_hotsure はロック避ける設計で1度だけ | P0 |
| ほつれ購入_複数個 | payment_intent.amount = 240, quantity = 2 | 複数ほつれパック購入 | 1. isValidHotsurePurchase(240, 2) = true<br/>2. bonus_hotsure を +2<br/>3. hotsure_purchases.quantity = 2 | P0 |

#### 6. ほつれ購入_上限チェック

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| ほつれ上限_購入前チェック | hotsure_remaining + bonus_hotsure = 2 | Checkoutセッション作成前 | 1. RPC: check_hotsure_purchase_allowed() で拒否<br/>2. CreateHotsureCheckoutSession エラー返却<br/>3. ユーザーはボタンクリックできない（UI無効化） | P0 |
| ほつれ上限_購入中チェック | 実行中に他のWebhookで +1 → 合計2に | 並行購入時 | 1. RPC のFOR UPDATE でロック<br/>2. 後発のCheckout拒否<br/>3. Webhook処理は両方成功（各々トランザクション） | P1 |

#### 7. イベント順序と一貫性

| テスト名 | イベント | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| イベント順序_subscription_updated_before_deleted | subscription.updated (status='past_due') → subscription.deleted | ユーザーが支払い遅延後に解約 | 1. 1つ目で status='past_due' に更新<br/>2. 2つ目で plan_type='free', status='canceled' に更新<br/>3. 最終状態は 'canceled' | P1 |
| 未対応イベント | 'payment_method.attached' など未対応イベント | 実装外のイベント受信 | 1. logger.info で記録「Unhandled event type: payment_method.attached」<br/>2. 200 OK応答<br/>3. DB変更なし | P1 |

### 整合性テスト

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| エントリ作成時の制限チェック | 1. ユーザーがエントリ作成API呼び出し<br/>2. checkEntryLimit()が'allowed=false' を返す | 1. エントリは作成されない<br/>2. UI: 「本日の投稿上限に達しました」エラー | P0 |
| 画像添付時の制限チェック | 1. ユーザーが画像添付<br/>2. checkImageLimit()が'allowed=false' を返す | 1. 画像はアップロードされない<br/>2. UI: 「今月の画像上限に達しました」エラー | P0 |
| Webhook遅延時の状態不一致 | 1. Checkoutセッション完了<br/>2. Webhook受信が30秒遅延<br/>3. その間にユーザーが制限チェック | 1. 最初は無料プラン扱い<br/>2. Webhook実行後はプレミアム扱い<br/>3. ユーザーがリロードすると反映 | P1 |

## テスト環境設定

### 依存パッケージ

```bash
# ユニット・統合テスト
pnpm add -D jest @testing-library/react @testing-library/jest-dom ts-jest

# Webhook テスト
pnpm add -D stripe stripe-cli  # Stripe CLIをローカル実行
```

### 環境変数（.env.test）

```env
# Stripe Test Mode
STRIPE_SECRET_KEY=sk_test_**** # テストシークレットキー
STRIPE_WEBHOOK_SECRET=whsec_test_**** # テストWebhookシークレット

# Price IDs（Stripe Test Mode）
STRIPE_PRICE_PREMIUM_MONTHLY=price_test_monthly_****
STRIPE_PRICE_PREMIUM_YEARLY=price_test_yearly_****
STRIPE_PRICE_HOTSURE_PACK=price_test_hotsure_****

# Database
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJ...（テスト用）

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ローカルWebhookテスト実行

```bash
# ターミナル1: 開発サーバー起動
pnpm dev

# ターミナル2: Stripe CLI でリッスン開始
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# ターミナル3: テストイベント送信
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger payment_intent.succeeded
```

### テストDB初期化スクリプト

```bash
# ローカルDB リセット
pnpm db:reset

# マイグレーション適用
pnpm db:push

# テストユーザー作成（option）
npx tsx scripts/seed-test-users.ts
```

## テスト実行順序

### Phase 1: ユニットテスト（P0）

```bash
# 関数・定数のテスト
pnpm test src/features/billing/constants.test.ts
pnpm test src/features/billing/api/subscription-service.test.ts
pnpm test src/features/billing/api/plan-limits.test.ts
```

### Phase 2: API統合テスト（P0）

```bash
# Checkout, Portal, Webhook
pnpm test src/app/api/billing/limits/route.test.ts
pnpm test src/app/api/webhooks/stripe/route.test.ts
```

### Phase 3: E2Eテスト（P0）

```bash
# 正常系・異常系フロー
pnpm exec playwright test e2e/billing-*.spec.ts
```

### Phase 4: Webhook統合テスト（P0）

```bash
# Stripe CLIでローカルテスト
stripe trigger checkout.session.completed --override metadata.user_id=<test-uuid>
```

## 注意事項

1. **Stripe Test Mode使用**: 本番APIキーは一切使用しない
2. **ローカルDB**: `pnpm db:reset` で毎回クリーン初期化
3. **Webhook冪等性**: UNIQUE制約とトランザクション設計で保証
4. **ユーザー認証**: テストユーザーで事前作成
5. **制限値の日次・月次リセット**: JST基準で正確にテスト
6. **ほつれ上限**: RPC関数での排他制御を確認
