-- pg_cronジョブのスケジュール登録
-- 日次・週次バッチ処理を自動実行

-- pg_cron拡張機能を有効化（既に有効化されている場合はスキップ）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のジョブを削除（マイグレーション再実行時の冪等性確保）
SELECT cron.unschedule('daily-streak-check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-streak-check'
);

SELECT cron.unschedule('weekly-hotsure-reset') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-hotsure-reset'
);

-- 日次ストリーク判定ジョブ
-- 毎日0:00 JST = 15:00 UTC (前日の15:00 UTC)
SELECT cron.schedule(
  'daily-streak-check',
  '0 15 * * *',
  $$SELECT process_daily_streak()$$
);

-- 週次ほつれリセットジョブ
-- 毎週月曜0:00 JST = 月曜15:00 UTC (日曜15:00 UTC)
SELECT cron.schedule(
  'weekly-hotsure-reset',
  '0 15 * * 0',
  $$SELECT reset_hotsure_weekly()$$
);

-- ジョブ登録確認用コメント
COMMENT ON EXTENSION pg_cron IS 'PostgreSQL定期実行ジョブスケジューラ';
