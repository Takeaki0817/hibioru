# Requirements Document

## Introduction
本ドキュメントは、ヒビオル（hibioru）におけるストリーク（継続記録）およびほつれ（スキップ機能）の要件を定義する。この機能は、ADHD当事者の「継続することが最大の目的」という設計思想に基づき、Duolingo式ゲーミフィケーションを活用してユーザーのモチベーション維持を支援する。

ストリークは「失いたくない資産」として損失回避の心理効果を生み、ほつれは「途切れても大したことない」というセーフティネットを提供する。

## Requirements

### Requirement 1: ストリーク（継続記録）の計算
**Objective:** As a ユーザー, I want 継続記録が自動的に計算・更新される, so that 毎日の記録を続けるモチベーションを維持できる

#### Acceptance Criteria
1. When ユーザーがその日最初の記録を作成する, the Streak Service shall current_streakを1増加させる
2. When ユーザーがその日最初の記録を作成する, the Streak Service shall last_entry_dateを当日の日付に更新する
3. When current_streakがlongest_streakを超える, the Streak Service shall longest_streakをcurrent_streakの値に更新する
4. The Streak Service shall 継続判定の基準として「その日に1件以上の記録があること」を使用する
5. The Streak Service shall 日付切り替えの基準時刻を毎日0:00とする

### Requirement 2: ストリークの途切れ処理
**Objective:** As a ユーザー, I want 記録を忘れた場合でもlongest_streakは保持される, so that 過去の努力が無駄にならない

#### Acceptance Criteria
1. When 前日に記録がなく、ほつれも使用されなかった場合, the Streak Service shall current_streakを0にリセットする
2. When current_streakがリセットされる, the Streak Service shall longest_streakの値を維持する
3. If ストリークが途切れた日の判定時にエラーが発生した場合, the Streak Service shall エラーをログに記録し、ストリークデータを変更しない

### Requirement 3: ほつれ（スキップ機能）の自動消費
**Objective:** As a ユーザー, I want 記録を忘れた日に自動でほつれが消費される, so that 意図せず継続が途切れることを防げる

#### Acceptance Criteria
1. When 日付切り替え時に前日の記録がない and hotsure_remainingが1以上の場合, the Streak Service shall hotsure_remainingを1減少させる
2. When ほつれが自動消費される, the Streak Service shall 消費日をhotsure_used_dates配列に追加する
3. When ほつれが自動消費される, the Streak Service shall current_streakの値を維持する（途切れさせない）
4. If hotsure_remainingが0の場合, the Streak Service shall ほつれを消費せず、ストリーク途切れ処理を実行する
5. The Streak Service shall ほつれの自動消費をユーザー操作なしで実行する

### Requirement 4: ほつれの週次リセット処理
**Objective:** As a ユーザー, I want 毎週月曜日にほつれが補充される, so that 定期的にセーフティネットを利用できる

#### Acceptance Criteria
1. When 月曜日0:00になる, the Streak Service shall hotsure_remainingを2にリセットする
2. When ほつれがリセットされる, the Streak Service shall hotsure_used_dates配列をクリアする
3. The Streak Service shall ほつれの繰り越しを行わない（リセット前の残数に関わらず2個に設定）
4. The Streak Service shall ほつれの最大保持数を2個とする
5. If 週次リセット処理中にエラーが発生した場合, the Streak Service shall エラーをログに記録し、リトライ処理をスケジュールする

### Requirement 5: ストリークデータの初期化と有効化
**Objective:** As a 新規ユーザー, I want アカウント作成時にストリークデータが正しく初期化される, so that すぐに継続記録を始められる

#### Acceptance Criteria
1. When 新規ユーザーが作成される, the Streak Service shall streaksテーブルにレコードを作成する
2. When streaksレコードが作成される, the Streak Service shall current_streakを0に設定する
3. When streaksレコードが作成される, the Streak Service shall longest_streakを0に設定する
4. When streaksレコードが作成される, the Streak Service shall hotsure_remainingを2に設定する
5. When streaksレコードが作成される, the Streak Service shall hotsure_used_datesを空配列に設定する
6. The Streak Service shall ユーザーが最初の記録を作成するまでストリーク・ほつれ機能を有効化しない
7. When ユーザーが最初の記録を作成する, the Streak Service shall ストリーク・ほつれ機能を有効化する（日次バッチ処理の対象となる）

### Requirement 6: ストリーク情報の取得
**Objective:** As a ユーザー, I want 現在のストリーク状態を確認できる, so that 継続のモチベーションを維持できる

#### Acceptance Criteria
1. When ユーザーがストリーク情報をリクエストする, the Streak Service shall current_streak、longest_streak、hotsure_remaining、last_entry_dateを返却する
2. When ストリーク情報を返却する, the Streak Service shall hotsure_used_datesの件数を含める
3. The Streak Service shall 認証済みユーザーのみが自身のストリーク情報にアクセスできるようにする
4. If 該当ユーザーのstreaksレコードが存在しない場合, the Streak Service shall 初期値でレコードを作成して返却する

### Requirement 7: 日次バッチ処理
**Objective:** As a システム, I want 日付切り替え時に全ユーザーのストリーク状態を更新する, so that 継続記録が正確に維持される

#### Acceptance Criteria
1. When 毎日0:00になる, the Streak Service shall 全アクティブユーザーに対してストリーク判定処理を実行する
2. When 日次バッチ処理を実行する, the Streak Service shall 前日の記録有無を確認する
3. When 前日の記録がない and ほつれが利用可能な場合, the Streak Service shall ほつれ自動消費処理を実行する
4. When 前日の記録がない and ほつれが利用不可の場合, the Streak Service shall ストリーク途切れ処理を実行する
5. The Streak Service shall バッチ処理の実行結果をログに記録する
6. If バッチ処理中に個別ユーザーでエラーが発生した場合, the Streak Service shall 該当ユーザーをスキップして処理を継続し、エラーを記録する

### Requirement 8: ストリーク・ほつれの表示
**Objective:** As a ユーザー, I want ストリークとほつれの状態を確認できる, so that 継続のモチベーションを維持し、セーフティネットの残数を把握できる

#### Acceptance Criteria
1. The ソーシャルページ shall 現在のストリーク数（current_streak）を表示する
2. The ソーシャルページ shall 最長ストリーク数（longest_streak）を表示する
3. The ソーシャルページ shall ほつれ残数（hotsure_remaining）を表示する
4. The タイムラインヘッダー shall 記録のある日付を識別可能な形で表示する（ストリーク数自体は表示しない）
5. The 月カレンダー shall 記録のある日付を識別可能な形で表示する（ストリーク数自体は表示しない）
6. The 月カレンダー shall ほつれを使用した日付を🧵マークで表示する
