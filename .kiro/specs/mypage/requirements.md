# Requirements Document

> **⚠️ 非推奨通知**
>
> この仕様は`/social`ページに統合されました。新しい実装は`.kiro/specs/social/`を参照してください。
>
> **移行マッピング:**
> - プロフィール表示・編集 → `/social` ヘッダーセクション
> - ストリーク・ほつれ表示 → `/social` フッターセクション
> - 通知設定 → `.kiro/specs/notification/` (独立仕様)
> - データエクスポート → `/social` 設定メニュー
> - アカウント管理 → `/social` 設定メニュー

## Introduction
マイページは、ユーザーが自身のアカウント情報と継続記録を確認し、アプリケーションの各種設定を管理するための中央ハブである。ADHD当事者向けサービス「ヒビオル」において、継続の可視化による損失回避効果を最大化し、ユーザーのモチベーション維持を支援する重要な画面である。

本機能は以下の主要領域で構成される:
- ユーザープロフィール情報の表示
- 継続記録（ストリーク）とほつれ残りの可視化
- 通知設定の管理
- データエクスポート機能
- ログアウト機能

## Requirements

### Requirement 1: ユーザープロフィール表示
**Objective:** As a ユーザー, I want マイページで自分のアバターとユーザー名を確認したい, so that 自分のアカウント情報を把握できる

#### Acceptance Criteria
1. When ユーザーがマイページにアクセスする, the マイページ shall ユーザーのアバター画像を表示する
2. When ユーザーがマイページにアクセスする, the マイページ shall ユーザー名を表示する
3. If アバター画像が設定されていない場合, then the マイページ shall デフォルトのアバター画像を表示する
4. While ユーザーが認証済みの状態, the マイページ shall Supabase Authから取得したプロフィール情報を表示する

### Requirement 2: 継続記録（ストリーク）表示
**Objective:** As a ユーザー, I want 現在の継続記録と最長記録を確認したい, so that 継続のモチベーションを維持し、達成感を得られる

#### Acceptance Criteria
1. When ユーザーがマイページにアクセスする, the マイページ shall 現在の継続記録（日数）を「🔥」アイコンと共に表示する
2. When ユーザーがマイページにアクセスする, the マイページ shall 過去最長の継続記録（日数）を「🏆」アイコンと共に表示する
3. The マイページ shall 継続記録を「失いたくない資産」として視覚的に強調表示する
4. When 現在の継続記録が最長記録と一致する, the マイページ shall 現在が最高記録であることを視覚的に示す
5. When 継続記録が0日の場合, the マイページ shall 「今日から始めよう」等の励ましメッセージを表示する

### Requirement 3: ほつれ残り表示
**Objective:** As a ユーザー, I want 残りのほつれ回数を確認したい, so that セーフティネットの状況を把握し、計画的に継続できる

#### Acceptance Criteria
1. When ユーザーがマイページにアクセスする, the マイページ shall 現在のほつれ残り回数を「🧵」アイコンと共に表示する
2. The マイページ shall ほつれの最大値（週2回）に対する残り回数を表示する
3. If ほつれ残りが0の場合, then the マイページ shall 「ほつれ切れ」状態を視覚的に警告表示する
4. When ほつれ残りが1回の場合, the マイページ shall 残り少ないことを注意喚起する表示をする

### Requirement 4: 通知設定
**Objective:** As a ユーザー, I want プッシュ通知の設定を管理したい, so that 自分のペースでリマインダーを受け取れる

#### Acceptance Criteria
1. When ユーザーが通知設定セクションにアクセスする, the マイページ shall 現在の通知設定状態を表示する
2. When ユーザーが通知オン/オフを切り替える, the マイページ shall ブラウザの通知許可ダイアログを表示する
3. The マイページ shall 最大5つのリマインド設定を表示する
4. The 各リマインド設定 shall 時刻（00:00〜23:59）と有効/無効トグルを持つ
5. When ユーザーがリマインド設定を変更する, the マイページ shall 変更内容を即時にDBに保存する
6. If ブラウザが通知をサポートしていない場合, then the マイページ shall 通知非対応である旨のメッセージを表示する
7. If ユーザーがブラウザの通知許可を拒否している場合, then the マイページ shall ブラウザ設定からの許可が必要である旨を案内する

### Requirement 5: データエクスポート
**Objective:** As a ユーザー, I want 自分の投稿データをエクスポートしたい, so that AI（Claude等）を使った振り返りや分析、バックアップに活用できる

#### Acceptance Criteria
1. When ユーザーがデータエクスポートを選択する, the マイページ shall エクスポート形式の選択肢（JSON/Markdown）を表示する
2. When ユーザーがJSON形式を選択してエクスポートを実行する, the マイページ shall GET /api/export?format=json を呼び出してJSON形式のデータをダウンロードする
3. When ユーザーがMarkdown形式を選択してエクスポートを実行する, the マイページ shall GET /api/export?format=markdown を呼び出してMarkdown形式のデータをダウンロードする
4. When エクスポートを実行する, the マイページ shall エクスポート期間（開始日・終了日）を指定できるUIを提供する
5. While データエクスポート処理中, the マイページ shall ローディング状態を表示する
6. If エクスポートするデータが存在しない場合, then the マイページ shall 「エクスポート対象のデータがありません」とメッセージを表示する
7. When エクスポートが完了する, the マイページ shall ファイルのダウンロードを開始する
8. The マイページ shall エクスポートファイルに適切なファイル名（日付を含む）を付与する

### Requirement 6: ログアウト
**Objective:** As a ユーザー, I want 安全にログアウトしたい, so that 共有デバイスでも安心してアプリを使用できる

#### Acceptance Criteria
1. When ユーザーがログアウトボタンをタップする, the マイページ shall ログアウト確認ダイアログを表示する
2. When ユーザーがログアウトを確定する, the マイページ shall Supabase Authからサインアウト処理を実行する
3. When ログアウト処理が完了する, the マイページ shall ユーザーをログインページにリダイレクトする
4. When ログアウト処理が完了する, the マイページ shall ローカルに保存されたセッション情報をクリアする
5. If ログアウト処理中にエラーが発生した場合, then the マイページ shall エラーメッセージを表示し、再試行を促す

### Requirement 7: アカウント削除
**Objective:** As a ユーザー, I want アカウントを削除したい, so that サービスの利用を完全に終了できる

#### Acceptance Criteria
1. The マイページ shall アカウント削除ボタンを表示する
2. When ユーザーがアカウント削除ボタンをクリックする, the マイページ shall 確認モーダルを表示する
3. The 確認モーダル shall ユーザーに「delete」と入力することを求める
4. When ユーザーが「delete」と正確に入力して確認ボタンをクリックする, the マイページ shall アカウント削除処理を実行する
5. When アカウント削除が実行される, the システム shall 該当ユーザーのすべてのデータ（entries, images, hotsure履歴, 通知設定等）を削除する
6. When アカウント削除が実行される, the システム shall Supabase Authからユーザーを削除する
7. When アカウント削除が完了する, the マイページ shall ユーザーをログイン画面にリダイレクトする
8. If 「delete」以外の文字列が入力される, then the マイページ shall 削除を実行せず、エラーメッセージを表示する

### Requirement 8: お問い合わせ
**Objective:** As a ユーザー, I want サービスに関する問い合わせやフィードバックを送りたい, so that 問題報告や改善提案ができる

#### Acceptance Criteria
1. The マイページ shall お問い合わせフォームへのリンクを表示する
2. When ユーザーがお問い合わせリンクをタップする, the マイページ shall 外部のお問い合わせフォーム（Google Form等）を新しいタブで開く

### Requirement 9: アクセス制御
**Objective:** As a システム, I want マイページへのアクセスを認証済みユーザーに限定したい, so that ユーザーのプライバシーとデータセキュリティを保護できる

#### Acceptance Criteria
1. If 未認証ユーザーがマイページにアクセスした場合, then the マイページ shall ユーザーをログインページにリダイレクトする
2. While セッションが有効な状態, the マイページ shall ユーザー固有のデータのみを表示する
3. The マイページ shall 他のユーザーのデータにアクセスできないようにする

### Requirement 10: レスポンシブ対応
**Objective:** As a ユーザー, I want どのデバイスからでもマイページを快適に利用したい, so that 場所を選ばずアカウント管理ができる

#### Acceptance Criteria
1. The マイページ shall モバイル、タブレット、デスクトップの各画面サイズに適切にレイアウトを調整する
2. The マイページ shall タッチ操作とマウス操作の両方に対応する
3. The マイページ shall PWAとしてホーム画面から起動した際も正常に動作する
