-- ヒビオル初期スキーマ
-- リモートSupabaseに適用済みのスキーマをローカル用に統合

-- ========================================
-- usersテーブル: ユーザー基本情報
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみ読み書き可能
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- インデックス
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ========================================
-- entriesテーブル: 記録エントリ
-- ========================================
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のエントリのみ読み書き可能
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス（日付順取得用）
CREATE INDEX IF NOT EXISTS entries_user_created_idx ON entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entries_user_date_idx ON entries(user_id, DATE(created_at AT TIME ZONE 'Asia/Tokyo'));

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ========================================
-- streaksテーブル: ストリーク（継続記録）
-- ========================================
CREATE TABLE IF NOT EXISTS streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_entry_date DATE,
  hotsure_remaining INTEGER NOT NULL DEFAULT 2,
  hotsure_used_dates DATE[] NOT NULL DEFAULT '{}'
);

-- RLSを有効化
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のストリークのみ読み書き可能
CREATE POLICY "Users can view own streak"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- コメント
COMMENT ON COLUMN streaks.hotsure_remaining IS 'ほつれ残り回数（週2回付与）';
COMMENT ON COLUMN streaks.hotsure_used_dates IS 'ほつれ使用日（自動消費記録）';

-- ========================================
-- push_subscriptionsテーブル: プッシュ通知購読
-- ========================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- RLSを有効化
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- push_subscriptions ポリシー
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);

-- ========================================
-- notification_settingsテーブル: 通知設定
-- ========================================
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  main_reminder_time TIME NOT NULL DEFAULT '21:00',
  chase_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  chase_reminder_delay_minutes INTEGER NOT NULL DEFAULT 60
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

-- コメント
COMMENT ON COLUMN notification_settings.main_reminder_time IS 'メインリマインド時刻（JST）';
COMMENT ON COLUMN notification_settings.chase_reminder_delay_minutes IS '追いリマインド遅延（分）';
