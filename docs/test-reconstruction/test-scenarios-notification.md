# テストシナリオ: notification

このドキュメントは、通知機能（notification）の包括的なテストシナリオを定義します。仕様書、設計ドキュメント、およびギャップ分析に基づいて構成されています。

## 概要

| 項目 | 内容 |
|------|------|
| 対象機能 | プッシュ通知（購読管理、設定、リマインド配信） |
| 仕様書 | `.kiro/specs/notification/requirements.md`, `design.md` |
| 実装 | `src/features/notification/` |
| テスト分類 | ユニット, 統合, E2E |

## ギャップ確認

### 既知のギャップ（テスト時に考慮）

| # | ギャップ | 優先度 | テスト対応 |
|----|---------|--------|-----------|
| 1 | 通知クリック先: 仕様`/new`、実装`/` | 中 | テスト対象外（実装に合わせる） |
| 2 | reminder_index: ログ未出力 | 低 | 定数レベルのテスト対象外 |
| 3 | activeDays UI: 未実装 | 中 | テスト対象外（仕様から削除の可能性） |
| 4 | API パス不一致 | 低 | 実装に合わせたテスト |
| 5 | テスト未実装 | 高 | **本ドキュメント対象** |

---

## ユニットテスト

### API関数

#### 1. 通知設定の取得

| テスト名 | 対象関数 | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| `getNotificationSettings - 既存設定取得` | `getNotificationSettings` | ユーザーが既に設定を保有する場合、DBから取得する | `ok: true`で設定オブジェクトを返却 | **P0** |
| `getNotificationSettings - デフォルト値返却` | `getNotificationSettings` | レコード未作成時（PGRST116エラー）、デフォルト値を返す | `ok: true`で`enabled: false`のデフォルト設定を返却 | **P0** |
| `getNotificationSettings - reminders補完` | `getNotificationSettings` | 古いデータで`reminders`配列が5未満の場合、埋め合わせる | remindersが常に5要素配列で返却される | **P0** |
| `getNotificationSettings - DB接続エラー` | `getNotificationSettings` | DB接続失敗時のエラー処理 | `ok: false`で`code: 'DB_ERROR'`を返却 | **P1** |

#### 2. 通知設定の更新

| テスト名 | 対象関数 | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| `updateNotificationSettings - 新規作成` | `updateNotificationSettings` | ユーザーが初めて設定を保存する場合、レコード作成 | `ok: true`で新規作成された設定を返却 | **P0** |
| `updateNotificationSettings - 既存更新` | `updateNotificationSettings` | 既存設定を部分更新する場合、upsertで更新 | `ok: true`で更新後の設定を返却 | **P0** |
| `updateNotificationSettings - reminders更新` | `updateNotificationSettings` | reminders配列をupdateする場合、JSON型として正しく保存 | 保存したreminders値が正確に復元される | **P0** |
| `updateNotificationSettings - バリデーション` | `updateNotificationSettings` | 不正な値（follow_up_max_count > 5など）を拒否 | チェック制約により更新が失敗するか、アプリで事前バリデーション | **P1** |
| `updateNotificationSettings - 部分更新` | `updateNotificationSettings` | `{ enabled: true }`のみ指定した場合、他の値は変更されない | 指定されたフィールドのみ更新される | **P1** |

### フック

#### 3. 通知権限管理

| テスト名 | 対象フック | テスト内容 | 期待結果 | 優先度 |
|---------|-----------|-----------|---------|--------|
| `useNotificationPermission - サポート検出` | `useNotificationPermission` | ブラウザが通知APIをサポートしている場合を検出 | `isSupported: true`を返却 | **P0** |
| `useNotificationPermission - サポート未対応` | `useNotificationPermission` | IE等の非対応ブラウザを検出 | `isSupported: false`を返却 | **P0** |
| `useNotificationPermission - 権限リクエスト成功` | `useNotificationPermission` | ユーザーが通知を許可した場合 | `permission: 'granted'`で返却、`requestPermission`がtrue相当 | **P0** |
| `useNotificationPermission - 権限リクエスト拒否` | `useNotificationPermission` | ユーザーが通知を拒否した場合 | `permission: 'denied'`で返却 | **P0** |
| `useNotificationPermission - SSR安全性` | `useNotificationPermission` | サーバーサイドレンダリング時、エラーが発生しない | `isSupported: false`、`permission: 'default'`で安全に初期化される | **P1** |

#### 4. Push購読管理

| テスト名 | 対象フック | テスト内容 | 期待結果 | 優先度 |
|---------|-----------|-----------|---------|--------|
| `usePushSubscription - 購読登録` | `usePushSubscription` | `subscribe()`でService Workerから購読情報を取得して登録 | APIが呼ばれ、DBに保存される | **P0** |
| `usePushSubscription - 購読登録失敗` | `usePushSubscription` | Service Workerが利用不可な場合 | エラーを発生させる | **P1** |
| `usePushSubscription - 購読解除` | `usePushSubscription` | `unsubscribe()`でエンドポイントを指定して削除 | DBから削除される | **P0** |
| `usePushSubscription - 重複購読の防止` | `usePushSubscription` | 同じエンドポイントで2回目の購読を試みる場合 | エラーを返却するか、既存レコードをスキップ | **P1** |

### メッセージサービス

#### 5. 通知文言生成

| テスト名 | 対象関数 | テスト内容 | 期待結果 | 優先度 |
|---------|---------|-----------|---------|--------|
| `getMainMessage - ランダム選択` | `getMainMessage` | メインリマインドの文言をランダムに選択 | MAIN_MESSAGES配列内の要素が返される | **P0** |
| `getMainMessage - タイトル一致` | `getMainMessage` | 返却されるメッセージのtitleが"ヒビオル" | `title === 'ヒビオル'`を確認 | **P1** |
| `getFollowUpMessage - 1回目` | `getFollowUpMessage` | `count=1`で1回目用の文言を返す | FOLLOW_UP_1_MESSAGES配列内の要素が返される | **P0** |
| `getFollowUpMessage - 2回目` | `getFollowUpMessage` | `count=2`で2回目用の文言を返す | FOLLOW_UP_2_MESSAGES配列内の要素が返される | **P0** |
| `getFollowUpMessage - 5回目以上` | `getFollowUpMessage` | `count>=5`で最終用の文言を返す | FOLLOW_UP_5_MESSAGES配列内の要素が返される | **P0** |
| `getFollowUpMessage - 0以下` | `getFollowUpMessage` | `count=0`で1回目用の文言を返す（ガード処理） | FOLLOW_UP_1_MESSAGES配列内の要素が返される | **P1** |
| `getFollowUpMessage - null/undefined拒否` | `getFollowUpMessage` | nullやundefinedが渡された場合 | エラーを発生させるか、デフォルト処理 | **P1** |

### ストア（存在する場合）

#### 6. 通知状態管理

| テスト名 | 対象ストア | テスト内容 | 期待結果 | 優先度 |
|---------|-----------|-----------|---------|--------|
| `notification-store - 初期状態` | Zustand（あれば） | ストアの初期状態を確認 | `enabled: false`など仕様のデフォルト値 | **P1** |
| `notification-store - 設定変更` | Zustand（あれば） | アクション経由で設定を更新 | ストア内の値が即座に更新される | **P1** |

---

## E2Eテスト

### 正常系

#### 7. 通知許可フロー

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **通知設定ページへのアクセス** | 1. ホームからソーシャルページへ遷移<br/>2. 通知設定セクションを表示 | 設定UI（トグルスイッチ）が表示される | **P0** |
| **通知許可フロー成功** | 1. 「通知を有効化」トグルをクリック<br/>2. ブラウザの通知許可ダイアログで「許可」を選択<br/>3. 購読登録が完了<br/>4. 「有効」状態でサーバーに保存 | トグルが「オン」状態に変更され、DBに`enabled: true`が保存される | **P0** |
| **通知許可フロー拒否** | 1. 「通知を有効化」トグルをクリック<br/>2. ブラウザの通知許可ダイアログで「ブロック」を選択<br/>3. エラーメッセージを表示 | エラーメッセージ「通知が拒否されました。ブラウザの設定から許可してください。」が表示される | **P0** |
| **複数デバイスからの購読** | 1. デバイスAで通知を有効化<br/>2. デバイスBで同じアカウントで通知を有効化 | 両デバイスの購読情報がDBに別レコードで保存される | **P0** |

#### 8. 通知設定の変更

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **リマインド時刻の設定** | 1. 通知設定ページを開く<br/>2. 最初のリマインド入力欄に「10:00」を入力<br/>3. 「保存」ボタンをクリック | 時刻がDBに保存され、再度開いた時に「10:00」が表示される | **P0** |
| **複数リマインド設定** | 1. 5つのリマインド欄に異なる時刻を入力<br/>2. 「保存」ボタンをクリック | すべての時刻がDBに保存される | **P0** |
| **リマインド有効/無効の切り替え** | 1. 「10:00」のトグルをオン<br/>2. 「14:00」のトグルをオフ<br/>3. 保存 | `enabled: true/false`がそれぞれ記録される | **P0** |
| **全体の有効/無効切り替え** | 1. マスタートグルをオフ<br/>2. 保存<br/>3. 再度ページを開く | すべてのリマインドの送信が停止される | **P1** |
| **ソーシャル通知の設定** | 1. 「ソーシャル通知」トグルをオフ<br/>2. 保存 | `social_notifications_enabled: false`がDBに保存される | **P1** |

#### 9. 通知クリック遷移

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **通知クリック時の遷移** | 1. 設定後、Playwright/Playwrightでモック通知を表示<br/>2. 通知をクリック<br/>3. アプリ内ページへ遷移 | ホーム（`/`）またはエントリー投稿画面（`/new`）へ遷移 ※ギャップ1参照 | **P1** |
| **ウィンドウフォーカス処理** | 1. アプリがバックグラウンドで動作中<br/>2. 通知をクリック<br/>3. アプリウィンドウがフォアグラウンドに | ウィンドウが最前面に来る（focus処理） | **P1** |

#### 10. 通知受信（モック）

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **Service Workerのプッシュイベント処理** | 1. Service Workerがモック通知を受け取る<br/>2. `push`イベントハンドラが実行<br/>3. `showNotification()`が呼ばれる | ブラウザが通知を表示する | **P1** |
| **通知クリックイベント処理** | 1. Service Workerが`notificationclick`イベントを受け取る<br/>2. イベントハンドラが実行<br/>3. URLが開く | 指定されたURLが新規タブまたは既存ウィンドウで開く | **P1** |

### 異常系

#### 11. エラー処理

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **購読登録失敗時の再試行** | 1. ネットワークエラーを注入<br/>2. 購読登録を試みる<br/>3. エラーメッセージを表示<br/>4. 「再試行」ボタンをクリック | 再度購読登録が試みられ、成功する | **P1** |
| **ブラウザ非対応時の表示** | 1. Notification APIをサポートしないブラウザで実行<br/>2. 設定ページを開く | 「このブラウザは通知をサポートしていません」メッセージが表示され、トグルが無効化される | **P0** |
| **設定更新失敗時** | 1. サーバー障害を注入<br/>2. 設定を更新<br/>3. エラーメッセージを表示 | ユーザーフレンドリーなエラーメッセージが表示される | **P1** |
| **無効な購読情報の削除** | 1. DBに無効なエンドポイント（410 Gone）を持つレコードを挿入<br/>2. Edge Functionを実行<br/>3. 該当レコードが削除される | DBから削除される | **P2** |

#### 12. バリデーションエラー

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **時刻形式の検証** | 1. 不正な時刻「25:00」を入力<br/>2. 保存を試みる | エラーメッセージが表示される | **P1** |
| **最大リマインド数超過** | 1. 6番目のリマインド欄を見つけようとする<br/>2. UIが5スロットのみを提供 | 6番目以降のスロットは存在しない | **P0** |
| **リマインド時刻未入力時の有効化拒否** | 1. リマインドを有効化したまま時刻欄を空にする<br/>2. 保存を試みる | エラーメッセージ「有効な場合は時刻を入力してください」が表示される | **P1** |

### 境界値・エッジケース

#### 13. 境界値テスト

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **リマインド時刻の境界値 - 00:00** | 1. リマインド時刻に「00:00」を入力<br/>2. 保存 | 正常に保存される（0時を表す有効な時刻） | **P1** |
| **リマインド時刻の境界値 - 23:59** | 1. リマインド時刻に「23:59」を入力<br/>2. 保存 | 正常に保存される（23時59分を表す有効な時刻） | **P1** |
| **追いリマインドの最大回数 - 1回** | 1. `follow_up_max_count: 1`で設定<br/>2. メインリマインド送信後、1回で中止 | 追いリマインドが1回で終了される | **P1** |
| **追いリマインドの最大回数 - 5回** | 1. `follow_up_max_count: 5`で設定<br/>2. メインリマインド送信後、最大5回送信 | 追いリマインドが5回で終了される | **P1** |
| **追いリマインド遅延時間** | 1. `chase_reminder_delay_minutes: 15`で設定<br/>2. 次の追いリマインド時刻が正しく計算される | メインリマインド送信から15分後に送信予定が設定される | **P1** |

#### 14. 同時実行・競合条件

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **複数デバイスからの同時更新** | 1. デバイスAで時刻「10:00」を入力<br/>2. デバイスBで時刻「14:00」を同時に入力<br/>3. 両デバイスから保存リクエスト | 後から保存された値がDBに反映される（last-write-wins）または競合警告を表示 | **P2** |
| **購読登録中の再リクエスト** | 1. 購読登録リクエスト送信中に再度トグルをクリック<br/>2. 登録処理が並行実行される | 重複登録が防止される、またはローディング状態でボタンが無効化される | **P2** |

#### 15. データ永続性

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **設定の永続性** | 1. リマインドを複数設定して保存<br/>2. ページをリロード<br/>3. 設定が復元される | 保存した全リマインドが再度表示される | **P0** |
| **ブラウザリセット後の復帰** | 1. キャッシュをクリア<br/>2. ページを再度開く<br/>3. DBから設定を取得 | 最新の設定が取得される | **P1** |
| **購読情報の永続性** | 1. Service Workerが登録されたまま30日経過<br/>2. デバイスが再起動されてもエンドポイントが有効 | 購読情報がDBに保持され、通知が送信される | **P2** |

---

## テスト実装優先度ガイド

### Phase 1（P0: 必須）

以下のテストは実装前に必ず実装します。

- **API関数**: `getNotificationSettings`, `updateNotificationSettings`のハッピーパス
- **フック**: `useNotificationPermission`, `usePushSubscription`の基本機能
- **メッセージ**: `getMainMessage`, `getFollowUpMessage`
- **E2E**: 通知許可フロー、リマインド設定、ブラウザ非対応対応

### Phase 2（P1: 推奨）

ベースが完成した後、以下を追加します。

- **API**: エラーハンドリング、データ補完ロジック
- **フック**: SSR安全性、エッジケース
- **E2E**: 全体のトグル切り替え、エラー再試行、バリデーション

### Phase 3（P2: 拡張）

安定性確保後、以下を追加します。

- **同時実行テスト**
- **データ永続性テスト**
- **無効購読の自動削除テスト**

---

## テストデータ・フィクスチャ

### ユーザー

```typescript
const TEST_USER = {
  id: 'test-user-123',
  email: 'test@example.com',
}
```

### 通知設定

```typescript
const TEST_SETTINGS = {
  user_id: TEST_USER.id,
  enabled: true,
  reminders: [
    { time: '10:00', enabled: true },
    { time: '14:00', enabled: true },
    { time: null, enabled: false },
    { time: null, enabled: false },
    { time: null, enabled: false },
  ],
  chase_reminder_enabled: true,
  chase_reminder_delay_minutes: 60,
  follow_up_max_count: 2,
  social_notifications_enabled: true,
}
```

### 購読情報

```typescript
const TEST_SUBSCRIPTION = {
  user_id: TEST_USER.id,
  endpoint: 'https://fcm.googleapis.com/...',
  keys: {
    p256dh: 'base64-encoded-key',
    auth: 'base64-encoded-auth',
  },
}
```

---

## 関連ファイル

| ファイル | 用途 |
|---------|------|
| `src/features/notification/api/service.ts` | 設定取得・更新のロジック |
| `src/features/notification/hooks/use-notification-permission.ts` | 権限管理フック |
| `src/features/notification/hooks/use-push-subscription.ts` | 購読管理フック |
| `src/features/notification/messages.ts` | 文言生成ロジック |
| `src/features/notification/components/notification-settings.tsx` | 設定UI |
| `src/features/notification/types.ts` | 型定義 |
| `.kiro/specs/notification/requirements.md` | 要件仕様 |
| `.kiro/specs/notification/design.md` | 設計ドキュメント |

---

## 実装手順

### ステップ1: ユニットテスト（1-6）

**対象ファイル**:
- `src/features/notification/__tests__/service.test.ts`
- `src/features/notification/__tests__/use-notification-permission.test.ts`
- `src/features/notification/__tests__/use-push-subscription.test.ts`
- `src/features/notification/__tests__/messages.test.ts`

**コマンド**:
```bash
pnpm test src/features/notification
```

### ステップ2: E2E テスト（7-15）

**対象ファイル**:
- `e2e/notification-settings.spec.ts`
- `e2e/notification-permission.spec.ts`
- `e2e/notification-edge-cases.spec.ts`

**コマンド**:
```bash
pnpm exec playwright test e2e/notification-settings.spec.ts
```

### ステップ3: 統合テスト

**対象**: API エンドポイント `/api/notification/settings` の動作確認

**手順**:
1. `POST /api/notification/subscribe` で購読登録
2. `PUT /api/notification/settings` で設定更新
3. `DELETE /api/notification/unsubscribe` で購読解除

---

## 注記

### ギャップ対応

- **ギャップ1（通知クリック先）**: 現実装が`/`の場合、テストはそれに合わせる。仕様を実装に更新するか、実装を仕様に修正するか判断後、テストを調整してください。
- **ギャップ2（reminder_index ログ）**: 低優先度のため、テスト対象外。必要に応じて設計ドキュメントから削除検討。
- **ギャップ3（activeDays UI）**: 未実装のため、テスト対象外。仕様から削除または実装計画に追加してください。

### モック戦略

- **Service Worker**: Playwright で `Service Worker` イベントをシミュレート
- **Notification API**: ユーザー権限リクエストをモック
- **Push Service**: Edge Functions のテストで `web-push` ライブラリをモック

### CI/CD 統合

```yaml
# .github/workflows/test.yml（参考）
- name: Notification Unit Tests
  run: pnpm test src/features/notification

- name: Notification E2E Tests
  run: pnpm exec playwright test e2e/notification-*.spec.ts
```
