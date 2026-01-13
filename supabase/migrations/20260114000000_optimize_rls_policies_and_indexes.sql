-- =========================================================================
-- Security Advisor対応: RLSポリシー最適化とインデックス修正
-- =========================================================================
-- 対応内容:
-- 1. auth.uid() → (select auth.uid()) に変換（パフォーマンス最適化）
-- 2. 複数permissiveポリシーを統合（achievements, celebrations, entries）
-- 3. 外部キーインデックス追加（3件）
-- 4. 未使用インデックス削除（3件）
-- =========================================================================

-- =========================================================================
-- SECTION 1: users テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- =========================================================================
-- SECTION 2: entries テーブル（2つのSELECTポリシーを統合）
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own entries" ON entries;
DROP POLICY IF EXISTS "Users can view following users shared entries" ON entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON entries;

-- 統合: 自分のエントリ OR フォローしている人の共有エントリ
CREATE POLICY "Users can view entries"
  ON entries FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (
      is_shared = TRUE
      AND is_deleted = FALSE
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = (select auth.uid())
          AND following_id = entries.user_id
      )
    )
  );

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING ((select auth.uid()) = user_id);

-- =========================================================================
-- SECTION 3: streaks テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own streak" ON streaks;
DROP POLICY IF EXISTS "Users can update own streak" ON streaks;
DROP POLICY IF EXISTS "Users can insert own streak" ON streaks;

CREATE POLICY "Users can view own streak"
  ON streaks FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own streak"
  ON streaks FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own streak"
  ON streaks FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================================================
-- SECTION 4: notification_settings テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON notification_settings;

CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================================================
-- SECTION 5: notification_logs テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;

CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING ((select auth.uid()) = user_id);

-- =========================================================================
-- SECTION 6: push_subscriptions テーブル
-- =========================================================================
-- 古いポリシーを削除
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================================================
-- SECTION 7: follows テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own follow relationships" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

CREATE POLICY "Users can view own follow relationships"
  ON follows FOR SELECT
  USING ((select auth.uid()) = follower_id OR (select auth.uid()) = following_id);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK ((select auth.uid()) = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING ((select auth.uid()) = follower_id);

-- =========================================================================
-- SECTION 8: achievements テーブル（2つのSELECTポリシーを統合）
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
DROP POLICY IF EXISTS "Users can view following users achievements" ON achievements;

-- 統合: 自分の達成 OR フォローしている人の達成
CREATE POLICY "Users can view achievements"
  ON achievements FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = (select auth.uid())
        AND following_id = achievements.user_id
    )
  );

-- =========================================================================
-- SECTION 9: celebrations テーブル（2つのSELECTポリシーを統合）
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own celebrations" ON celebrations;
DROP POLICY IF EXISTS "Users can view celebrations on own achievements" ON celebrations;
DROP POLICY IF EXISTS "Users can celebrate" ON celebrations;
DROP POLICY IF EXISTS "Users can remove own celebration" ON celebrations;

-- 統合: 自分が送ったお祝い OR 自分の達成へのお祝い
CREATE POLICY "Users can view celebrations"
  ON celebrations FOR SELECT
  USING (
    (select auth.uid()) = from_user_id
    OR EXISTS (
      SELECT 1 FROM achievements
      WHERE achievements.id = celebrations.achievement_id
        AND achievements.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can celebrate"
  ON celebrations FOR INSERT
  WITH CHECK ((select auth.uid()) = from_user_id);

CREATE POLICY "Users can remove own celebration"
  ON celebrations FOR DELETE
  USING ((select auth.uid()) = from_user_id);

-- =========================================================================
-- SECTION 10: social_notifications テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own social notifications" ON social_notifications;
DROP POLICY IF EXISTS "Users can update own social notifications" ON social_notifications;

CREATE POLICY "Users can view own social notifications"
  ON social_notifications FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own social notifications"
  ON social_notifications FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================================================
-- SECTION 11: subscriptions テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Service role用（auth.role()も最適化）
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING ((select auth.role()) = 'service_role');

-- =========================================================================
-- SECTION 12: hotsure_purchases テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own purchases" ON hotsure_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON hotsure_purchases;
DROP POLICY IF EXISTS "Service role can manage purchases" ON hotsure_purchases;

CREATE POLICY "Users can view own purchases"
  ON hotsure_purchases FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own purchases"
  ON hotsure_purchases FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Service role用（auth.role()も最適化）
CREATE POLICY "Service role can manage purchases"
  ON hotsure_purchases FOR ALL
  USING ((select auth.role()) = 'service_role');

-- =========================================================================
-- SECTION 13: 外部キーインデックス追加
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_achievements_entry_id
  ON achievements(entry_id);

CREATE INDEX IF NOT EXISTS idx_social_notifications_achievement_id
  ON social_notifications(achievement_id);

CREATE INDEX IF NOT EXISTS idx_social_notifications_from_user_id
  ON social_notifications(from_user_id);

-- =========================================================================
-- SECTION 14: 未使用インデックス削除
-- =========================================================================
DROP INDEX IF EXISTS follows_created_idx;
DROP INDEX IF EXISTS achievements_created_idx;
DROP INDEX IF EXISTS celebrations_created_idx;
