# Requirements Document

## Introduction
本ドキュメントは、ヒビオル（hibioru）のプッシュ通知機能の要件を定義する。Web Push APIを使用したリマインド通知、追いリマインド、通知設定管理を実装し、ADHD当事者の「忘れる」「自分から動けない」という課題に対応する。通知は継続を促すツールであり、ユーザーにストレスを与えない設計を最優先とする。

## Requirements

### Requirement 1: プッシュ通知購読管理
**Objective:** As a ユーザー, I want デバイスでプッシュ通知を受け取れるように登録したい, so that 記録を忘れないようリマインドを受けられる

#### Acceptance Criteria
1. When ユーザーが通知許可を承諾する, the 通知サービス shall Web Pushの購読情報（endpoint, p256dh, auth）をpush_subscriptionsテーブルに保存する
2. When ユーザーが同一アカウントで別デバイスから通知を登録する, the 通知サービス shall 新しいデバイスの購読情報を追加登録する（複数デバイス対応）
3. When ユーザーが通知の購読を解除する, the 通知サービス shall 該当デバイスの購読情報をpush_subscriptionsテーブルから削除する
4. If ブラウザが通知をサポートしていない, the 通知サービス shall 通知機能が利用できない旨を表示し、通知設定を無効化する
5. If push_subscriptionsへの登録に失敗する, the 通知サービス shall エラーメッセージを表示し、再試行を促す

### Requirement 2: 通知設定管理
**Objective:** As a ユーザー, I want 通知の時刻や追いリマインドの設定をカスタマイズしたい, so that 自分の生活リズムに合った通知を受けられる

#### Acceptance Criteria
1. The 通知サービス shall 通知設定（enabled, primaryTime, timezone, followUpEnabled, followUpIntervalMinutes, followUpMaxCount, activeDays）をnotification_settingsテーブルで管理する
2. When ユーザーが通知設定を変更する, the 通知サービス shall 変更内容をnotification_settingsテーブルに即時反映する
3. When 新規ユーザーが登録される, the 通知サービス shall デフォルト設定（primaryTime: "21:00", timezone: "Asia/Tokyo", followUpEnabled: true, followUpIntervalMinutes: 60, followUpMaxCount: 2, activeDays: [0,1,2,3,4,5,6]）を適用する
4. The 通知サービス shall primaryTimeの設定範囲を00:00〜23:59に制限する
5. The 通知サービス shall followUpIntervalMinutesの設定範囲を15〜180分に制限する
6. The 通知サービス shall followUpMaxCountの設定範囲を1〜3回に制限する
7. The 通知サービス shall activeDaysで指定された曜日（0:日曜〜6:土曜）のみ通知を送信する

### Requirement 3: メインリマインド通知
**Objective:** As a ユーザー, I want 設定した時刻に記録を促す通知を受け取りたい, so that 日々の記録を忘れずに継続できる

#### Acceptance Criteria
1. When ユーザーのprimaryTimeに達する and 通知が有効 and 当日がactiveDaysに含まれる, the 通知サービス shall メインリマインド通知を送信する
2. When メインリマインド通知を送信する, the 通知サービス shall 「今日はどんな一日だった？」「一言だけでも残しておこう」のいずれかの文言を使用する
3. When 通知を送信する, the 通知サービス shall notification_logsテーブルに送信記録（user_id, type: "main", sent_at, result）を保存する
4. When ユーザーが当日すでに記録を完了している, the 通知サービス shall メインリマインド通知をスキップする
5. If 通知の送信に失敗する, the 通知サービス shall notification_logsにresult: "failed"を記録する

### Requirement 4: 追いリマインド機能
**Objective:** As a ユーザー, I want 記録を忘れた場合に追加のリマインドを受けたい, so that 記録の機会を逃さない

#### Acceptance Criteria
1. While followUpEnabledが有効, when primaryTime後に記録がない and followUpMaxCountに達していない, the 通知サービス shall followUpIntervalMinutes経過後に追いリマインドを送信する
2. When 追いリマインド1回目を送信する, the 通知サービス shall 「まだ間に合うよ」「30秒で終わる」のいずれかの文言を使用する
3. When 追いリマインド2回目を送信する, the 通知サービス shall 「今日の最後のチャンス」「ほつれ使う？」のいずれかの文言を使用する
4. When ユーザーが記録を完了する, the 通知サービス shall 予定されていた追いリマインドをキャンセルする
5. When 追いリマインドを送信する, the 通知サービス shall notification_logsテーブルに送信記録（user_id, type: "follow_up_1"または"follow_up_2", sent_at, result）を保存する
6. When followUpMaxCountに達する, the 通知サービス shall 当日の追いリマインドを終了する

### Requirement 5: 通知配信基盤
**Objective:** As a システム管理者, I want 通知が適切なタイミングで確実に配信されることを保証したい, so that ユーザー体験の一貫性を維持できる

#### Acceptance Criteria
1. The 通知サービス shall ユーザーごとのtimezoneに基づいて通知時刻を計算する
2. The 通知サービス shall 全登録デバイスに対して通知を送信する
3. If 購読エンドポイントが無効（410 Gone）を返す, the 通知サービス shall 該当の購読情報をpush_subscriptionsから自動削除する
4. The 通知サービス shall 通知送信処理をバックグラウンドジョブとして非同期実行する
5. When 通知がクリックされる, the 通知サービス shall ヒビオルのアプリ画面（記録入力画面）を開く

### Requirement 6: 通知履歴と分析
**Objective:** As a ユーザー, I want 通知が記録に繋がったかを追跡したい, so that 通知の効果を確認できる

#### Acceptance Criteria
1. When 通知を送信後にユーザーが記録を作成する, the 通知サービス shall notification_logsのentry_recorded_atを更新する
2. The 通知サービス shall 通知から記録までの応答時間（sent_at〜entry_recorded_at）を計算可能な形式で保存する
3. The 通知サービス shall notification_logsを90日間保持する
