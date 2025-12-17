-- ========================================
-- notification_logsテーブル: 通知送信ログ
-- ========================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('main_reminder', 'chase_reminder')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'skipped')),
  entry_recorded_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- notification_logs ポリシー
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- インデックス（日付範囲検索用）
CREATE INDEX IF NOT EXISTS notification_logs_user_sent_idx ON notification_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS notification_logs_type_idx ON notification_logs(type);

-- コメント
COMMENT ON TABLE notification_logs IS '通知送信履歴（分析・デバッグ用）';
COMMENT ON COLUMN notification_logs.type IS '通知種別（main_reminder: 定時通知, chase_reminder: 追いリマインド）';
COMMENT ON COLUMN notification_logs.result IS '送信結果（success: 成功, failed: 失敗, skipped: スキップ）';
COMMENT ON COLUMN notification_logs.entry_recorded_at IS '通知送信時点で記録があった場合のタイムスタンプ';
