-- batch_logsのstatus制約を修正
-- 'partial_failure'ステータスを許可する

-- 既存の制約を削除
ALTER TABLE batch_logs DROP CONSTRAINT IF EXISTS batch_logs_status_check;

-- 新しい制約を追加（partial_failureを含む）
ALTER TABLE batch_logs
  ADD CONSTRAINT batch_logs_status_check
  CHECK (status IN ('success', 'failed', 'partial_failure'));

-- コメント更新
COMMENT ON COLUMN batch_logs.status IS 'ステータス（success: 成功, failed: 失敗, partial_failure: 一部失敗）';
