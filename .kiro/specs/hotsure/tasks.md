# Implementation Tasks

> **Note**: この機能は実装完了済み。仕様書は実装から逆生成されたもの。

## Task 1: データベーススキーマ設計

- [x] streaksテーブルにhotsure_remainingカラム追加（INTEGER, DEFAULT 2）
- [x] streaksテーブルにhotsure_used_datesカラム追加（DATE[], DEFAULT '{}'）
- [x] 新規ユーザー作成トリガーでhotsure初期値を設定

## Task 2: consume_hotsure SQL関数実装

- [x] `supabase/migrations/20251217030000_create_consume_hotsure_function.sql` 作成
- [x] FOR UPDATEによる行レベルロック実装
- [x] 残数チェックロジック実装
- [x] 同日二重消費防止ロジック実装
- [x] JSONB形式での結果返却

## Task 3: reset_hotsure_weekly SQL関数実装

- [x] `supabase/migrations/20251217040000_create_reset_hotsure_function.sql` 作成
- [x] 全ユーザーのhotsure_remaining = 2にリセット
- [x] 全ユーザーのhotsure_used_dates = {}にクリア
- [x] batch_logsへの結果記録
- [x] エラーハンドリングとログ記録

## Task 4: pg_cronスケジュール設定

- [x] `supabase/migrations/20251217070000_schedule_cron_jobs.sql` でcronジョブ登録
- [x] 毎週月曜0:00 JSTにreset_hotsure_weekly実行

## Task 5: TypeScript Service Layer実装

- [x] `src/features/hotsure/types.ts` - 型定義
  - [x] HotsureInfo インターフェース
  - [x] ConsumeHotsureResult インターフェース
  - [x] ResetHotsureResult インターフェース
- [x] `src/features/hotsure/api/service.ts` - サービス関数
  - [x] getHotsureInfo() - 情報取得
  - [x] canUseHotsure() - 使用可否判定
  - [x] consumeHotsure() - 消費処理
  - [x] resetHotsureWeekly() - 週次リセット

## Task 6: HotsureDisplayコンポーネント実装

- [x] `src/features/hotsure/components/hotsure-display.tsx` 作成
- [x] CVAバリアントによる3段階ステータス表示
  - [x] empty (残数0): 赤色、shakeアニメーション
  - [x] warning (残数1): 黄色、pulseアニメーション
  - [x] safe (残数2): 青色、通常表示
- [x] 糸巻きアイコン（Spool）によるプログレス表示
- [x] 次の月曜日までの日数計算・表示
- [x] 説明パネル

## Task 7: ソーシャルページへの統合

- [x] `/social` ページにHotsureDisplay配置
- [x] streaksデータからhotsure情報を取得して表示

## Task 8: process_daily_streakとの連携

- [x] 日次バッチ処理でほつれ自動消費を呼び出し
- [x] 記録がない日にconsume_hotsureを実行
- [x] 消費成功時はストリーク維持
- [x] 消費失敗時（残数0）はストリークリセット
