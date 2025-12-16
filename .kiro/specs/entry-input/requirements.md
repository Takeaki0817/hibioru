# Requirements Document

## Introduction
入力/編集ページ機能の要件定義書。ADHD当事者向けの「2タップで記録完了」「絵文字1つでもOK」というコンセプトに基づき、テキスト入力、画像添付、下書き保存機能を持つ記録入力画面を実装する。継続することを最優先とし、入力のハードルを極限まで下げる設計を行う。

## Requirements

### Requirement 1: テキスト入力
**Objective:** ユーザーとして、最小限の操作で瞬間的な記録を残したいので、シンプルなテキスト入力機能が必要である

#### Acceptance Criteria
1. When ユーザーが新規入力ページ (/new) にアクセスした, the 入力画面 shall 画面全体を使った集中モードの入力エリアを表示する
2. The 入力フォーム shall プレーンテキスト形式での入力を受け付ける
3. The 入力フォーム shall 絵文字1文字のみの入力を有効な記録として受け付ける
4. When ユーザーがテキストを入力して送信ボタンをタップした, the 入力画面 shall 2タップ以内で記録を完了する
5. While ユーザーがテキストを入力中, the 入力画面 shall 入力内容の文字数を表示しない（プレッシャーを与えない）

### Requirement 2: 画像添付
**Objective:** ユーザーとして、テキストだけでなく画像も添付したいので、簡単な画像アップロード機能が必要である

#### Acceptance Criteria
1. When ユーザーが画像添付ボタンをタップした, the 入力画面 shall デバイスの画像選択インターフェースを表示する
2. When ユーザーが画像を選択した, the 入力画面 shall browser-image-compressionを使用して画像を200KB以下に圧縮する
3. When 画像の圧縮が完了した, the 入力画面 shall 圧縮された画像のプレビューを表示する
4. The 入力画面 shall 1投稿あたり最大1枚の画像添付を許可する
5. If ユーザーが1日に5枚目を超える画像をアップロードしようとした, then the 入力画面 shall 「本日の画像アップロード上限（5枚）に達しました」というメッセージを表示する
6. When 画像付き投稿が送信された, the システム shall 画像をSupabase Storageにアップロードしてimage_urlをentriesテーブルに保存する

### Requirement 3: 下書き自動保存
**Objective:** ユーザーとして、入力途中で画面を離れても内容を失いたくないので、自動的に下書きが保存される機能が必要である

#### Acceptance Criteria
1. While ユーザーがテキストを入力中, the 入力画面 shall 入力内容をローカルストレージに自動保存する
2. When ユーザーが新規入力ページにアクセスした and 保存された下書きが存在する, the 入力画面 shall 下書きの内容を入力エリアに復元する
3. When 投稿が正常に送信された, the 入力画面 shall ローカルストレージから下書きを削除する
4. The 下書き保存機能 shall 添付画像のプレビュー情報も含めて保存する

### Requirement 4: 記録の編集
**Objective:** ユーザーとして、投稿後に誤りに気づいた場合に修正したいので、記録の編集機能が必要である

#### Acceptance Criteria
1. When ユーザーが編集ページ (/edit/[id]) にアクセスした, the 編集画面 shall 既存の記録内容を入力エリアに表示する
2. The 編集画面 shall 新規入力と同じUIを使用する
3. When ユーザーが編集内容を保存した, the システム shall 同じIDのレコードを上書き更新する
4. If 記録の作成から24時間以上経過している, then the 編集画面 shall 「編集可能期間（24時間）を過ぎています」というメッセージを表示して編集を拒否する
5. When 編集が保存された, the システム shall updated_atタイムスタンプを更新する

### Requirement 5: 投稿制限
**Objective:** システムとして、ベータ版での適切なリソース管理を行いたいので、投稿数の制限が必要である

#### Acceptance Criteria
1. The システム shall 1日あたり最大20件の投稿を許可する（ベータ版）
2. If ユーザーが1日の投稿上限（20件）に達した, then the 入力画面 shall 「本日の投稿上限（20件）に達しました」というメッセージを表示する
3. The 投稿カウント shall 毎日0:00（JST）にリセットされる

### Requirement 6: 記録の削除
**Objective:** ユーザーとして、不要な記録を削除したいので、削除機能が必要である

#### Acceptance Criteria
1. When ユーザーが記録の削除を選択した, the システム shall 確認ダイアログを表示する
2. When ユーザーが削除を確認した, the システム shall 該当レコードのis_deletedフラグをtrueに設定する（論理削除）
3. The システム shall 論理削除された記録をユーザーに表示しない

### Requirement 7: データ構造
**Objective:** システムとして、記録データを適切に永続化したいので、データベーステーブル構造が必要である

#### Acceptance Criteria
1. The entriesテーブル shall id, user_id, content, image_url, is_public, is_deleted, created_at, updated_atのカラムを持つ
2. When 新規記録が作成された, the システム shall user_idに現在のユーザーIDを設定する
3. When 新規記録が作成された, the システム shall created_atに現在のタイムスタンプを設定する
4. The entriesテーブル shall is_deletedのデフォルト値をfalseとする
5. The entriesテーブル shall is_publicのデフォルト値をfalseとする
