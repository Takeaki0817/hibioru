-- achievements に updated_at カラムを追加
-- 投稿編集時に Realtime UPDATE イベントを発火させるため

-- updated_at カラム追加
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 既存レコードの updated_at を created_at で初期化
UPDATE achievements
SET updated_at = created_at
WHERE updated_at = NOW();

-- 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成（UPDATE時に updated_at を自動更新）
DROP TRIGGER IF EXISTS achievements_updated_at_trigger ON achievements;
CREATE TRIGGER achievements_updated_at_trigger
  BEFORE UPDATE ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_achievements_updated_at();

-- コメント追加
COMMENT ON COLUMN achievements.updated_at IS '更新日時（投稿編集時のRealtime通知用）';
