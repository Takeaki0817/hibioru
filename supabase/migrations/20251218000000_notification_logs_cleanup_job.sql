-- ========================================
-- 通知ログクリーンアップジョブ
-- ========================================
-- 90日経過した通知ログを毎日削除するpg_cronジョブ
-- Requirements: 6.3
--
-- 実行タイミング: 毎日3:00 JST (18:00 UTC前日)
-- 目的: ストレージ最適化、パフォーマンス維持

-- 既存のジョブを削除（マイグレーション再実行時の冪等性確保）
SELECT cron.unschedule('cleanup-notification-logs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-notification-logs'
);

-- 通知ログクリーンアップジョブ
-- 毎日3:00 JST = 18:00 UTC (前日)
SELECT cron.schedule(
  'cleanup-notification-logs',
  '0 18 * * *',
  $$
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ジョブ登録確認用コメント
COMMENT ON TABLE notification_logs IS '通知送信履歴（90日間保持、毎日自動クリーンアップ）';
