# Requirements Document

## Project Description (Input)
フォロー/フォロワー機能とお祝い機能: ユーザー間でフォローし合える機能。投稿数や継続記録日数のマイルストーンに達したときに、フォロワーに自動でお祝いを促し、お祝いボタンで相手に通知を送る機能。**投稿内容はすべて非公開（自分のみ表示）とし、マイルストーン達成のみを共有する。**

## Introduction

ソーシャル機能は、ヒビオルのPhase 3機能として、ユーザー間の緩やかなつながりと相互の継続支援を実現します。

**設計原則**:
- SNS化しない（無限スクロール、いいね数表示、おすすめなし）
- 比較・競争を煽らない
- 報酬は「継続」に対してのみ
- ADHD当事者にストレスを与えない
- **投稿内容は完全にプライベート**

**目的**:
- フォローしたユーザーの継続状況（ストリーク、投稿数）を確認できる
- マイルストーン達成時に相互にお祝いを送り合う
- 投稿内容は見えず、継続の事実のみを共有する「支援型ソーシャル」

## Requirements

### Requirement 1: フォロー/フォロワー機能

**Objective:** As a ユーザー, I want 他のユーザーをフォローできる機能, so that 継続を応援し合える関係を築ける

#### Acceptance Criteria

1. When ユーザーが他のユーザーのプロフィールでフォローボタンをタップ, the Social Service shall フォロー関係を作成し、相手のフォロワー数を1増やす
2. When ユーザーがフォロー中のユーザーのフォローボタンをタップ, the Social Service shall フォローを解除し、相手のフォロワー数を1減らす
3. The Social Service shall ユーザーのフォロー数とフォロワー数をプロフィールに表示する
4. When ユーザーがフォロー一覧またはフォロワー一覧を開く, the Social Service shall それぞれのリストをユーザー名、アイコン、ストリーク日数、総投稿数と共に表示する
5. The Social Service shall フォロー関係は一方向（相互フォローは双方向のフォローとして扱う）を保証する

#### Non-Functional Requirements

- フォロー/フォロー解除のレスポンスタイムは1秒以内
- フォロー数・フォロワー数の上限は設けない（将来的な制限は検討可能）

---

### Requirement 2: マイルストーン検出と通知

**Objective:** As a システム, I want ユーザーのマイルストーン達成を自動検出する, so that フォロワーにお祝いを促すことができる

#### Acceptance Criteria

1. When ユーザーが投稿を作成, the Milestone Service shall ユーザーの総投稿数を確認する
2. If 総投稿数が特定の数値（10, 50, 100, 500, 1000件）に達した, then the Milestone Service shall 投稿数マイルストーン達成を記録する
3. When ユーザーのストリーク日数が更新, the Milestone Service shall ストリーク日数を確認する
4. If ストリーク日数が特定の数値（7, 30, 100, 365, 1000日）に達した, then the Milestone Service shall ストリークマイルストーン達成を記録する
5. When マイルストーン達成を記録, the Milestone Service shall 該当ユーザーのフォロワー全員にお祝い促進通知を送信する
6. The Milestone Service shall 同じマイルストーンに対して重複通知を送信しない

#### Milestone Thresholds

**投稿数マイルストーン**: 10, 50, 100, 500, 1000, 5000, 10000件
**ストリークマイルストーン**: 7, 30, 100, 365, 1000, 3650日

---

### Requirement 3: お祝い機能

**Objective:** As a ユーザー, I want フォロワーのマイルストーン達成をお祝いできる, so that 相互に継続を応援し合える

#### Acceptance Criteria

1. When フォロー中のユーザーがマイルストーンに達した, the Notification Service shall 「〇〇さんが△△件投稿しました！」通知をユーザーに送信する
2. When ユーザーがマイルストーン通知をタップ, the Social Service shall お祝いボタンを含むマイルストーン詳細画面を表示する
3. When ユーザーがお祝いボタンをタップ, the Social Service shall お祝いを記録し、達成者に「〇〇さんがあなたをお祝いしました」プッシュ通知を送信する
4. The Social Service shall 1つのマイルストーンに対して同じユーザーから複数回お祝いできないようにする
5. When 達成者がお祝い通知を確認, the Social Service shall お祝いしたユーザーのリストを表示する
6. The Social Service shall お祝い数を達成者のプロフィールまたはマイルストーン詳細に表示する

#### Non-Functional Requirements

- お祝い通知は達成から30秒以内に配信
- お祝いボタンのタップからプッシュ通知送信まで1秒以内

---

### Requirement 4: ユーザー検索

**Objective:** As a ユーザー, I want ユーザー名やIDで他のユーザーを検索できる, so that フォローしたいユーザーを見つけられる

#### Acceptance Criteria

1. When ユーザーが検索画面でキーワードを入力, the Search Service shall ユーザー名、表示名、ユーザーIDに部分一致するユーザーをリアルタイムで表示する
2. The Search Service shall 検索結果にユーザー名、アイコン、ストリーク日数、総投稿数、自己紹介（最初の50文字）を含める
3. When ユーザーが検索結果のユーザーをタップ, the Social Service shall そのユーザーのプロフィール画面を表示する
4. The Search Service shall 検索結果は最大20件までに制限し、「もっと見る」でページネーションする
5. If 検索結果が0件, then the Search Service shall 「該当するユーザーが見つかりません」メッセージを表示する

#### Non-Functional Requirements

- 検索のレスポンスタイムは500ms以内
- 検索はクライアント側でデバウンス（300ms）を実装

---

### Requirement 5: プロフィール公開

**Objective:** As a ユーザー, I want 自分のプロフィール情報を他のユーザーに公開できる, so that フォローしてもらいやすくなる

#### Acceptance Criteria

1. The Profile Service shall ユーザープロフィールにユーザー名、アイコン、自己紹介、ストリーク日数、総投稿数、フォロー数、フォロワー数を表示する
2. When 他のユーザーがプロフィールを閲覧, the Profile Service shall 基本情報（ユーザー名、アイコン、自己紹介、ストリーク日数、総投稿数、フォロー数、フォロワー数）のみを表示し、投稿内容は表示しない
3. When ユーザーがプロフィール編集画面を開く, the Profile Service shall ユーザー名、アイコン、自己紹介の編集UIを提供する
4. When ユーザーがプロフィールを更新, the Profile Service shall 変更を保存し、即座に他のユーザーに反映する
5. The Profile Service shall ユーザー名は一意であることを保証する

#### Non-Functional Requirements

- プロフィール画像は最大2MBまで、WebP形式に自動変換
- 自己紹介は最大200文字まで

---

### Requirement 6: 通知設定

**Objective:** As a ユーザー, I want ソーシャル機能の通知を個別に制御できる, so that 自分のペースで使える

#### Acceptance Criteria

1. The Notification Service shall 通知設定画面に「フォロワーのマイルストーン通知」「お祝い受け取り通知」の個別トグルを提供する
2. When ユーザーが特定の通知をオフにする, the Notification Service shall その種類の通知を送信しない
3. The Notification Service shall デフォルトですべての通知をオンに設定する
4. When ユーザーが通知設定を変更, the Notification Service shall 即座に設定を保存し、次回の通知から反映する

---

### Requirement 7: プライバシーとセキュリティ

**Objective:** As a システム, I want ユーザーのプライバシーとデータ安全性を保証する, so that 安心して使える

#### Acceptance Criteria

1. The Social Service shall すべての投稿は投稿者以外からアクセス不可能であることをAPI・DB層で保証する
2. The Social Service shall フォロー関係、お祝い履歴はユーザー自身のみが削除可能とする
3. When ユーザーがアカウント削除, the Social Service shall フォロー関係、お祝い履歴、マイルストーン記録をすべて削除する
4. The Social Service shall 他のユーザーの非公開情報（メールアドレス、通知設定等）を公開しない
5. If 不正なAPIアクセスを検出（他人の投稿取得等）, then the API Gateway shall リクエストを拒否しログに記録する

---

### Requirement 8: パフォーマンスとスケーラビリティ

**Objective:** As a システム, I want ソーシャル機能が効率的に動作する, so that ユーザー数が増えても快適に使える

#### Acceptance Criteria

1. The Milestone Service shall マイルストーン判定を投稿作成・ストリーク更新のイベント駆動で実行する
2. The Notification Service shall プッシュ通知送信をバックグラウンドジョブ（Supabase Edge Functions等）で非同期実行する
3. The Social Service shall フォロー数・フォロワー数は非正規化してユーザーテーブルに保持する
4. The Social Service shall プロフィール取得にDBインデックス（user_id）を使用する
5. While ユーザー数が10,000人を超える, the Social Service shall プロフィール・フォローリスト取得のレスポンスタイムを2秒以内に維持する

---

## Out of Scope (Phase 3では実装しない)

- 投稿内容の共有機能（全投稿が非公開）
- 全体タイムライン機能（投稿を見せないため不要）
- ダイレクトメッセージ機能
- グループ機能
- 投稿へのコメント・リアクション（いいね）機能
- おすすめユーザー機能
- ハッシュタグ機能
- ブロック・ミュート機能（Phase 4で検討）

---

## Success Metrics

- フォロー機能の利用率: アクティブユーザーの30%以上が1人以上フォロー
- お祝い送信率: マイルストーン通知の20%以上でお祝いが送信される
- ソーシャル機能による継続率向上: フォロワーがいるユーザーの継続率が10%以上向上
- マイルストーン通知の開封率: 50%以上
