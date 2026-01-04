-- ソーシャル機能: テーブル作成

-- 1. follows テーブル（フォロー関係）
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)  -- 自分自身をフォローできない
);

-- インデックス
CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS follows_created_idx ON follows(created_at DESC);

COMMENT ON TABLE follows IS 'フォロー関係テーブル';
COMMENT ON COLUMN follows.follower_id IS 'フォローする側のユーザーID';
COMMENT ON COLUMN follows.following_id IS 'フォローされる側のユーザーID';

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 自分のフォロー関係は閲覧可能
CREATE POLICY "Users can view own follow relationships"
  ON follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- フォローは自分が主体
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- フォロー解除は自分が主体
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- service_role用
CREATE POLICY "Service role can access all follows"
  ON follows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 2. achievements テーブル（達成イベント）
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 達成種別: daily_posts, total_posts, streak_days, shared_entry
  threshold INTEGER NOT NULL,  -- 達成閾値
  value INTEGER NOT NULL,  -- 達成時の値
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,  -- 関連エントリ（共有投稿用）
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,  -- 共有エントリの場合true
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS achievements_user_created_idx ON achievements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS achievements_type_idx ON achievements(type);
CREATE INDEX IF NOT EXISTS achievements_created_idx ON achievements(created_at DESC);

COMMENT ON TABLE achievements IS '達成イベントテーブル';
COMMENT ON COLUMN achievements.type IS '達成種別: daily_posts（1日の投稿数）, total_posts（総投稿数）, streak_days（継続日数）, shared_entry（共有投稿）';
COMMENT ON COLUMN achievements.threshold IS '達成した閾値（例: 5投稿、10日連続）';
COMMENT ON COLUMN achievements.value IS '達成時点での実績値';
COMMENT ON COLUMN achievements.is_shared IS '共有エントリによる達成の場合true';

-- RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- 自分の達成は全て見れる
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

-- フォローしている人の達成のみ閲覧可能
CREATE POLICY "Users can view following users achievements"
  ON achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
        AND following_id = achievements.user_id
    )
  );

-- 達成の作成はシステムのみ（Server Action経由）
CREATE POLICY "Service role can manage achievements"
  ON achievements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. celebrations テーブル（お祝い）
CREATE TABLE IF NOT EXISTS celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(achievement_id, from_user_id)  -- 同一達成への重複お祝い防止
);

-- インデックス
CREATE INDEX IF NOT EXISTS celebrations_achievement_idx ON celebrations(achievement_id);
CREATE INDEX IF NOT EXISTS celebrations_from_user_idx ON celebrations(from_user_id);
CREATE INDEX IF NOT EXISTS celebrations_created_idx ON celebrations(created_at DESC);

COMMENT ON TABLE celebrations IS 'お祝いテーブル';
COMMENT ON COLUMN celebrations.achievement_id IS 'お祝い対象の達成ID';
COMMENT ON COLUMN celebrations.from_user_id IS 'お祝いを送ったユーザーID';

-- RLS
ALTER TABLE celebrations ENABLE ROW LEVEL SECURITY;

-- 自分が行ったお祝いは見れる
CREATE POLICY "Users can view own celebrations"
  ON celebrations FOR SELECT
  USING (auth.uid() = from_user_id);

-- 自分の達成へのお祝いは見れる
CREATE POLICY "Users can view celebrations on own achievements"
  ON celebrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM achievements
      WHERE achievements.id = celebrations.achievement_id
        AND achievements.user_id = auth.uid()
    )
  );

-- お祝いは自分が主体
CREATE POLICY "Users can celebrate"
  ON celebrations FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- お祝いの取り消しは自分のみ
CREATE POLICY "Users can remove own celebration"
  ON celebrations FOR DELETE
  USING (auth.uid() = from_user_id);

-- service_role用
CREATE POLICY "Service role can manage celebrations"
  ON celebrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 4. social_notifications テーブル（ソーシャル通知）
CREATE TABLE IF NOT EXISTS social_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 通知種別: celebration, follow
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS social_notifications_user_read_idx ON social_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS social_notifications_user_created_idx ON social_notifications(user_id, created_at DESC);

COMMENT ON TABLE social_notifications IS 'ソーシャル通知テーブル';
COMMENT ON COLUMN social_notifications.type IS '通知種別: celebration（お祝い）, follow（フォロー）';
COMMENT ON COLUMN social_notifications.from_user_id IS '通知を発生させたユーザーID';
COMMENT ON COLUMN social_notifications.achievement_id IS 'お祝い通知の場合、対象の達成ID';
COMMENT ON COLUMN social_notifications.is_read IS '既読フラグ';

-- RLS
ALTER TABLE social_notifications ENABLE ROW LEVEL SECURITY;

-- 自分への通知のみ読み取り可能
CREATE POLICY "Users can view own social notifications"
  ON social_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 自分への通知のみ更新可能（既読処理）
CREATE POLICY "Users can update own social notifications"
  ON social_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 通知作成はシステムのみ
CREATE POLICY "Service role can manage social notifications"
  ON social_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
