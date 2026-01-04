# Requirements Document

## Introduction
本ドキュメントは、ヒビオル（hibioru）のプッシュ通知機能の要件を定義する。Web Push APIを使用したリマインド通知と通知設定管理を実装し、ADHD当事者の「忘れる」「自分から動けない」という課題に対応する。通知は継続を促すツールであり、ユーザーにストレスを与えない設計を最優先とする。

## Requirements

### Requirement 1: プッシュ通知購読管理
**Objective:** As a ユーザー, I want デバイスでプッシュ通知を受け取れるように登録したい, so that 記録を忘れないようリマインドを受けられる

#### Acceptance Criteria
1. When ユーザーがソーシャルページで通知機能をオンにする, the 通知サービス shall ブラウザの通知許可ダイアログを表示する
2. When ユーザーが通知許可を承諾する, the 通知サービス shall Web Pushの購読情報（endpoint, p256dh, auth）をpush_subscriptionsテーブルに保存する
3. When ユーザーが同一アカウントで別デバイスから通知を有効化する, the 通知サービス shall 新しいデバイスの購読情報を追加登録する（複数デバイス対応）
4. When ユーザーが通知の購読を解除する, the 通知サービス shall 該当デバイスの購読情報をpush_subscriptionsテーブルから削除する
5. The 通知許可（ブラウザPermission） shall デバイスごとに独立して管理され、デバイス間で共有されない
6. If ブラウザが通知をサポートしていない, the 通知サービス shall 通知機能が利用できない旨を表示し、通知設定を無効化する
7. If push_subscriptionsへの登録に失敗する, the 通知サービス shall エラーメッセージを表示し、再試行を促す

### Requirement 2: 通知設定管理
**Objective:** As a ユーザー, I want 複数のリマインド時刻を設定したい, so that 自分の生活リズムに合った通知を受けられる

#### Acceptance Criteria
1. The 通知サービス shall ユーザーごとに最大5つのリマインド設定を提供する
2. The 各リマインド設定 shall 時刻（00:00〜23:59）と有効/無効トグルを持つ
3. The リマインド設定 shall DBに保存され、全デバイスで共有される
4. When 新規ユーザーが登録される, the 通知サービス shall 全リマインドをデフォルトでオフに設定する
5. When ユーザーがリマインド設定を変更する, the 通知サービス shall 変更内容をnotification_settingsテーブルに即時反映する
6. The 通知サービス shall 通知設定UIをソーシャルページに配置する
7. The 通知サービス shall timezoneをAsia/Tokyoとして通知時刻を計算する

### Requirement 3: リマインド通知
**Objective:** As a ユーザー, I want 設定した時刻に記録を促す通知を受け取りたい, so that 日々の記録を忘れずに継続できる

#### Acceptance Criteria
1. When リマインドの設定時刻に達する and 該当リマインドが有効, the 通知サービス shall リマインド通知を全登録デバイスに送信する
2. The 通知サービス shall 当日の記録有無に関わらず通知を送信する（記録済みでもスキップしない）
3. When リマインド通知を送信する, the 通知サービス shall 「今日はどんな一日だった？」「一言だけでも残しておこう」のいずれかの文言を使用する
4. When 通知を送信する, the 通知サービス shall notification_logsテーブルに送信記録（user_id, reminder_index, sent_at, result）を保存する
5. If 通知の送信に失敗する, the 通知サービス shall notification_logsにresult: "failed"を記録する

### Requirement 4: 通知配信基盤
**Objective:** As a システム管理者, I want 通知が適切なタイミングで確実に配信されることを保証したい, so that ユーザー体験の一貫性を維持できる

#### Acceptance Criteria
1. The 通知サービス shall timezoneに基づいて通知時刻を計算する
2. The 通知サービス shall ユーザーの全登録デバイスに対して通知を送信する
3. If 購読エンドポイントが無効（410 Gone）を返す, the 通知サービス shall 該当の購読情報をpush_subscriptionsから自動削除する
4. The 通知サービス shall 通知送信処理をバックグラウンドジョブとして非同期実行する
5. When 通知がクリックされる, the 通知サービス shall ヒビオルの記録入力画面（/new）を開く

### Requirement 5: 通知履歴と分析
**Objective:** As a ユーザー, I want 通知が記録に繋がったかを追跡したい, so that 通知の効果を確認できる

#### Acceptance Criteria
1. When 通知を送信後にユーザーが記録を作成する, the 通知サービス shall notification_logsのentry_recorded_atを更新する
2. The 通知サービス shall 通知から記録までの応答時間（sent_at〜entry_recorded_at）を計算可能な形式で保存する
3. The 通知サービス shall notification_logsを90日間保持する
