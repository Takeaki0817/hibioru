# Requirements Document

## Introduction
ほつれ（hotsure）機能は、ヒビオルにおけるストリーク継続保護の仕組みである。ADHDユーザーの「うっかり記録忘れ」を救済し、長期継続への心理的負担を軽減する。毎週2回自動付与され、記録がない日に自動消費される。

## Non-Goals
- 手動でのほつれ消費（ボタンを押して意図的に使う機能）
- ほつれの購入・課金機能
- ほつれ数の個人設定（固定で週2回）
- ほつれ使用の取り消し

## Requirements

### Requirement 1: 週次ほつれ付与
**Objective:** ユーザーとして、毎週自動的にほつれを補充してほしい。これにより、週に2回までの記録忘れが許容される安心感を得られる。

#### Acceptance Criteria
1. The システム shall 毎週月曜日0:00 JSTに全ユーザーのほつれを2回にリセットする
2. The システム shall リセット時にほつれ使用履歴（hotsure_used_dates）をクリアする
3. When ほつれがリセットされる, the システム shall batch_logsにリセット結果を記録する
4. If リセット処理に失敗する, the システム shall batch_logsにエラー情報を記録する

### Requirement 2: ほつれ自動消費
**Objective:** ユーザーとして、記録を忘れた日にほつれが自動で使われてストリークが維持されてほしい。これにより、意識せずに継続が守られる。

#### Acceptance Criteria
1. When 日次バッチ処理時にユーザーの当日記録がない, the システム shall ほつれを1つ自動消費する
2. When ほつれを消費する, the システム shall hotsure_remainingを1減少させる
3. When ほつれを消費する, the システム shall 消費日をhotsure_used_datesに追加する
4. When ほつれが消費される, the システム shall 当日の記録がなくてもcurrent_streakを維持する
5. If ほつれの残りがない, the システム shall current_streakを0にリセットする

### Requirement 3: 同時実行制御
**Objective:** システムとして、ほつれ消費時の同時実行を防止したい。これにより、二重消費や不整合を防げる。

#### Acceptance Criteria
1. When ほつれ消費処理が実行される, the システム shall FOR UPDATEでレコードをロックする
2. The システム shall 同一日に同一ユーザーのほつれを複数回消費しない
3. If 今日既にほつれを使用済み, the システム shall 消費処理をスキップする

### Requirement 4: ほつれ状態表示
**Objective:** ユーザーとして、現在のほつれ残数と次回補充までの日数を確認したい。これにより、計画的に記録できる。

#### Acceptance Criteria
1. The ソーシャルページ shall ほつれ残数（0〜2）を表示する
2. The ほつれ表示 shall 残数に応じた視覚的フィードバック（色、アイコン、メッセージ）を提供する
3. The ほつれ表示 shall 次の月曜日までの日数を表示する
4. When ほつれが0, the 表示 shall 警告状態（赤色、シェイクアニメーション）で表示する
5. When ほつれが1, the 表示 shall 注意状態（黄色、パルスアニメーション）で表示する
6. When ほつれが2, the 表示 shall 安全状態（青色、通常表示）で表示する

### Requirement 5: 新規ユーザー初期化
**Objective:** システムとして、新規ユーザーに適切なほつれ初期値を設定したい。これにより、新規ユーザーも最初から機能を利用できる。

#### Acceptance Criteria
1. When 新規ユーザーが登録される, the システム shall hotsure_remaining=2で初期化する
2. When 新規ユーザーが登録される, the システム shall hotsure_used_dates=[]で初期化する
3. The 初期化 shall auth.usersへのINSERTトリガーで自動実行される
