-- ========================================
-- notification_settingsテーブル: 通知設定
-- ========================================
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  main_reminder_time TIME NOT NULL DEFAULT '21:00:00',
  chase_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  chase_reminder_delay_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- notification_settings ポリシー
CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS notification_settings_user_idx ON notification_settings(user_id);

-- コメント
COMMENT ON TABLE notification_settings IS 'ユーザーごとの通知設定';
COMMENT ON COLUMN notification_settings.enabled IS '通知の有効/無効';
COMMENT ON COLUMN notification_settings.main_reminder_time IS 'メインリマインド時刻（HH:MM形式）';
COMMENT ON COLUMN notification_settings.chase_reminder_enabled IS '追いリマインドの有効/無効';
COMMENT ON COLUMN notification_settings.chase_reminder_delay_minutes IS '追いリマインド遅延時間（分）';
