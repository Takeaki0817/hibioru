-- ソーシャル機能: 既存テーブルへのカラム追加

-- notification_settings にソーシャル通知設定を追加
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS social_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN notification_settings.social_notifications_enabled IS 'お祝いやフォロー通知をブラウザ通知で受け取るか';

-- entries に共有フラグを追加
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN entries.is_shared IS 'ソーシャルタイムラインに共有するか';

-- 共有投稿のインデックス
CREATE INDEX IF NOT EXISTS entries_shared_created_idx ON entries(is_shared, created_at DESC)
WHERE is_shared = TRUE AND is_deleted = FALSE;

-- フォローしている人の共有投稿を閲覧可能にするRLSポリシー
CREATE POLICY "Users can view following users shared entries"
  ON entries FOR SELECT
  USING (
    is_shared = TRUE
    AND is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
        AND following_id = entries.user_id
    )
  );
