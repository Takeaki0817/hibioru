-- バッチログテーブル
-- 週次リセットなどのバッチ処理の実行記録

CREATE TABLE IF NOT EXISTS batch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  affected_rows INTEGER,
  error_message TEXT,
  metadata JSONB
);

-- インデックス（バッチ名と実行日時で検索用）
CREATE INDEX IF NOT EXISTS batch_logs_name_executed_idx ON batch_logs(batch_name, executed_at DESC);

-- コメント
COMMENT ON TABLE batch_logs IS 'バッチ処理の実行ログ';
COMMENT ON COLUMN batch_logs.batch_name IS 'バッチ処理名（例: reset_hotsure_weekly）';
COMMENT ON COLUMN batch_logs.affected_rows IS '影響を受けた行数';
COMMENT ON COLUMN batch_logs.metadata IS '追加のメタデータ（JSON形式）';
