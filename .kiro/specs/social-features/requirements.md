# Requirements Document

## Project Description (Input)
フォロー/フォロワー機能とお祝い機能: ユーザー間でフォローし合える機能。投稿数や継続記録日数のマイルストーンに達したときに、フォロワーに自動でお祝いを促し、お祝いボタンで相手に通知を送る機能。投稿の公開範囲設定（全体公開/フォロワーのみ/非公開）も含む。

## Introduction

ソーシャル機能は、ヒビオルのPhase 3機能として、ユーザー間の緩やかなつながりと相互の継続支援を実現します。

**設計原則**:
- SNS化しない（無限スクロール、いいね数表示、おすすめなし）
- 比較・競争を煽らない
- 報酬は「継続」に対してのみ
- ADHD当事者にストレスを与えない

**目的**:
- フォローしたユーザーの記録や継続状況を確認できる
- マイルストーン達成時に相互にお祝いを送り合う
- プライバシーを守りながら選択的に記録を共有する

## Requirements

### Requirement 1: フォロー/フォロワー機能

**Objective:** As a ユーザー, I want 他のユーザーをフォローできる機能, so that 継続を応援し合える関係を築ける

#### Acceptance Criteria

1. When ユーザーが他のユーザーのプロフィールでフォローボタンをタップ, the Social Service shall フォロー関係を作成し、相手のフォロワー数を1増やす
2. When ユーザーがフォロー中のユーザーのフォローボタンをタップ, the Social Service shall フォローを解除し、相手のフォロワー数を1減らす
3. The Social Service shall ユーザーのフォロー数とフォロワー数をプロフィールに表示する
4. When ユーザーがフォロー一覧またはフォロワー一覧を開く, the Social Service shall それぞれのリストをユーザー名、アイコン、ストリーク日数と共に表示する
5. The Social Service shall フォロー関係は一方向（相互フォローは双方向のフォローとして扱う）を保証する

#### Non-Functional Requirements

- フォロー/フォロー解除のレスポンスタイムは1秒以内
- フォロー数・フォロワー数の上限は設けない（将来的な制限は検討可能）

---

### Requirement 2: 投稿の公開範囲設定

**Objective:** As a ユーザー, I want 投稿ごとに公開範囲を設定できる, so that プライバシーを守りながら選択的に共有できる

#### Acceptance Criteria

1. When ユーザーが新規投稿を作成, the Entry Service shall 公開範囲選択UI（全体公開/フォロワーのみ/非公開）を表示する
2. The Entry Service shall デフォルトの公開範囲を「非公開」に設定する
3. When ユーザーが公開範囲を選択して投稿, the Entry Service shall 投稿に公開範囲メタデータを保存する
4. When 他のユーザーがタイムラインを閲覧, the Timeline Service shall 自分がフォローしているユーザーの「全体公開」または「フォロワーのみ」投稿のみを表示する
5. When ユーザーが自分の投稿を閲覧, the Timeline Service shall すべての公開範囲の投稿を表示する
6. When ユーザーが過去の投稿の公開範囲を変更, the Entry Service shall 公開範囲を更新し、他のユーザーの表示に即座に反映する

#### Non-Functional Requirements

- 公開範囲設定UIは投稿フォームに統合され、2タップ以内で変更可能
- 非公開投稿は他のユーザーから絶対にアクセス不可能であることを保証

---

### Requirement 3: 全体タイムライン

**Objective:** As a ユーザー, I want フォローしているユーザーの投稿を時系列で確認できる, so that 仲間の記録や様子を知ることができる

#### Acceptance Criteria

1. When ユーザーが「みんなのタイムライン」タブを開く, the Timeline Service shall フォロー中のユーザーの公開投稿を新しい順に表示する
2. The Timeline Service shall 各投稿にユーザー名、アイコン、投稿内容、投稿日時、公開範囲アイコンを含める
3. While タイムラインをスクロール, the Timeline Service shall 無限スクロールではなくページネーション（もっと見る）を実装する
4. If フォロー中のユーザーが0人, then the Timeline Service shall 「まだフォローしているユーザーがいません」メッセージとユーザー検索UIを表示する
5. The Timeline Service shall 自分の投稿は「みんなのタイムライン」に表示しない

#### Non-Functional Requirements

- タイムラインの初期ロードは2秒以内
- 1ページあたり20件の投稿を表示
- 無限スクロールを避けることでADHD当事者の過度な閲覧を防ぐ

---

### Requirement 4: マイルストーン検出と通知

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

### Requirement 5: お祝い機能

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

### Requirement 6: ユーザー検索

**Objective:** As a ユーザー, I want ユーザー名やIDで他のユーザーを検索できる, so that フォローしたいユーザーを見つけられる

#### Acceptance Criteria

1. When ユーザーが検索画面でキーワードを入力, the Search Service shall ユーザー名、表示名、ユーザーIDに部分一致するユーザーをリアルタイムで表示する
2. The Search Service shall 検索結果にユーザー名、アイコン、ストリーク日数、自己紹介（最初の50文字）を含める
3. When ユーザーが検索結果のユーザーをタップ, the Social Service shall そのユーザーのプロフィール画面を表示する
4. The Search Service shall 検索結果は最大20件までに制限し、「もっと見る」でページネーションする
5. If 検索結果が0件, then the Search Service shall 「該当するユーザーが見つかりません」メッセージを表示する

#### Non-Functional Requirements

- 検索のレスポンスタイムは500ms以内
- 検索はクライアント側でデバウンス（300ms）を実装

---

### Requirement 7: プロフィール公開

**Objective:** As a ユーザー, I want 自分のプロフィールを他のユーザーに公開できる, so that フォローしてもらいやすくなる

#### Acceptance Criteria

1. The Profile Service shall ユーザープロフィールにユーザー名、アイコン、自己紹介、ストリーク日数、総投稿数、フォロー数、フォロワー数を表示する
2. When 他のユーザーがプロフィールを閲覧, the Profile Service shall そのユーザーの公開投稿（全体公開、またはフォロワーの場合はフォロワーのみ投稿も含む）を時系列で表示する
3. When ユーザーがプロフィール編集画面を開く, the Profile Service shall ユーザー名、アイコン、自己紹介の編集UIを提供する
4. When ユーザーがプロフィールを更新, the Profile Service shall 変更を保存し、即座に他のユーザーに反映する
5. The Profile Service shall ユーザー名は一意であることを保証する

#### Non-Functional Requirements

- プロフィール画像は最大2MBまで、WebP形式に自動変換
- 自己紹介は最大200文字まで

---

### Requirement 8: 通知設定

**Objective:** As a ユーザー, I want ソーシャル機能の通知を個別に制御できる, so that 自分のペースで使える

#### Acceptance Criteria

1. The Notification Service shall 通知設定画面に「フォロワーのマイルストーン通知」「お祝い受け取り通知」の個別トグルを提供する
2. When ユーザーが特定の通知をオフにする, the Notification Service shall その種類の通知を送信しない
3. The Notification Service shall デフォルトですべての通知をオンに設定する
4. When ユーザーが通知設定を変更, the Notification Service shall 即座に設定を保存し、次回の通知から反映する

---

### Requirement 9: プライバシーとセキュリティ

**Objective:** As a システム, I want ユーザーのプライバシーとデータ安全性を保証する, so that 安心して使える

#### Acceptance Criteria

1. The Social Service shall 非公開投稿は投稿者以外からアクセス不可能であることをAPI・DB層で保証する
2. The Social Service shall フォロー関係、お祝い履歴はユーザー自身のみが削除可能とする
3. When ユーザーがアカウント削除, the Social Service shall フォロー関係、お祝い履歴、マイルストーン記録をすべて削除する
4. The Social Service shall 他のユーザーの非公開情報（メールアドレス、通知設定等）を公開しない
5. If 不正なAPIアクセスを検出（他人の非公開投稿取得等）, then the API Gateway shall リクエストを拒否しログに記録する

---

### Requirement 10: パフォーマンスとスケーラビリティ

**Objective:** As a システム, I want ソーシャル機能が効率的に動作する, so that ユーザー数が増えても快適に使える

#### Acceptance Criteria

1. The Timeline Service shall フォロー中のユーザー投稿取得にDBインデックス（user_id, created_at, visibility）を使用する
2. The Milestone Service shall マイルストーン判定を投稿作成・ストリーク更新のイベント駆動で実行する
3. The Notification Service shall プッシュ通知送信をバックグラウンドジョブ（Supabase Edge Functions等）で非同期実行する
4. The Social Service shall フォロー数・フォロワー数は非正規化してユーザーテーブルに保持する
5. While ユーザー数が10,000人を超える, the Social Service shall タイムライン取得のレスポンスタイムを2秒以内に維持する

---

## Out of Scope (Phase 3では実装しない)

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
- 公開投稿率: 全投稿の10%以上が「全体公開」または「フォロワーのみ」
- ソーシャル機能による継続率向上: フォロワーがいるユーザーの継続率が10%以上向上
