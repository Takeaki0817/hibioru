# Requirements Document

## Introduction
本ドキュメントは、ヒビオル（hibioru）アプリケーションにおけるGoogle OAuth認証機能の要件を定義する。Supabase Authを使用したGoogle認証を実装し、ADHD当事者にとってストレスフリーな認証体験を提供することを目的とする。

## Requirements

### Requirement 1: Google OAuthログイン
**Objective:** As a ユーザー, I want Googleアカウントでログインしたい, so that 既存のGoogleアカウントを使って簡単にサービスを利用できる

#### Acceptance Criteria
1. When ユーザーがGoogleログインボタンをクリックする, the Auth Module shall GoogleのOAuth認証画面にリダイレクトする
2. When ユーザーがGoogleでの認証を完了する, the Auth Module shall ユーザーをメインタイムライン画面にリダイレクトする
3. When ユーザーが初めてログインする, the Auth Module shall usersテーブルに新規ユーザーレコードを作成する
4. When ユーザーが既存アカウントでログインする, the Auth Module shall usersテーブルの既存レコードと紐付ける
5. If Google認証がキャンセルされる, then the Auth Module shall ユーザーをログイン画面に戻し、エラーメッセージは表示しない

### Requirement 2: ログイン画面UI
**Objective:** As a ユーザー, I want シンプルなログイン画面を見たい, so that 認知負荷なくすぐにログインできる

#### Acceptance Criteria
1. The Login Page shall Googleログインボタンのみを表示する
2. The Login Page shall サービス名「ヒビオル」とシンプルなキャッチコピーを表示する
3. The Login Page shall 2タップ以内でログイン完了できる導線を提供する
4. While ログイン処理中, the Login Page shall ローディング状態を表示する

### Requirement 3: ユーザーデータ管理
**Objective:** As a システム, I want ユーザー情報を適切に管理したい, so that 認証状態とユーザープロフィールを正しく保持できる

#### Acceptance Criteria
1. When 新規ユーザーが作成される, the Auth Module shall id(uuid), email, display_name, avatar_url, created_atを保存する
2. The Auth Module shall emailをGoogleアカウントから取得して保存する
3. The Auth Module shall display_nameをGoogleアカウントの名前から初期設定する
4. The Auth Module shall avatar_urlをGoogleアカウントのプロフィール画像URLから設定する（nullable）
5. The Auth Module shall created_atを現在時刻で自動設定する

### Requirement 4: 認証状態管理
**Objective:** As a ユーザー, I want ログイン状態を維持したい, so that 毎回ログインし直す手間を省ける

#### Acceptance Criteria
1. While ユーザーがログイン済み, the Auth Module shall 認証セッションを維持する
2. When 認証セッションが有効, the Auth Module shall 保護されたページへのアクセスを許可する
3. When 認証セッションが無効または期限切れ, the Auth Module shall ユーザーをログイン画面にリダイレクトする
4. The Auth Module shall セッショントークンをSupabase Authの標準方式で管理する

### Requirement 5: ログアウト機能
**Objective:** As a ユーザー, I want ログアウトしたい, so that 必要に応じてアカウントからサインアウトできる

#### Acceptance Criteria
1. When ユーザーがログアウトボタンをクリックする, the Auth Module shall 認証セッションを終了する
2. When ログアウトが完了する, the Auth Module shall ユーザーをログイン画面にリダイレクトする
3. When ログアウトが完了する, the Auth Module shall ローカルの認証情報をクリアする

### Requirement 6: 認証エラーハンドリング
**Objective:** As a ユーザー, I want 認証エラー時に適切な案内を受けたい, so that 問題が起きてもパニックにならずに対処できる

#### Acceptance Criteria
1. If Google認証で予期せぬエラーが発生する, then the Auth Module shall ユーザーフレンドリーなエラーメッセージを表示する
2. If ネットワークエラーが発生する, then the Auth Module shall 再試行を促すメッセージを表示する
3. The Auth Module shall エラー発生時もアプリがクラッシュしないよう graceful に処理する
4. If 認証エラーが発生する, then the Auth Module shall ユーザーが再度ログインを試行できる状態を維持する

### Requirement 7: ルート保護
**Objective:** As a システム, I want 認証が必要なページを保護したい, so that 未認証ユーザーが保護されたコンテンツにアクセスできないようにする

#### Acceptance Criteria
1. When 未認証ユーザーが保護されたページにアクセスする, the Auth Module shall ユーザーをログイン画面にリダイレクトする
2. The Auth Module shall /login 以外のすべてのページを認証必須とする
3. When 認証後にリダイレクトされた場合, the Auth Module shall 元のアクセス先ページに戻す
