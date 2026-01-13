-- =========================================================================
-- 残りのmultiple_permissive_policies警告を修正
-- =========================================================================
-- 対応内容:
-- 1. subscriptions/hotsure_purchases: Service roleポリシーを TO service_role に変更
-- 2. users: 重複するSELECTポリシーを削除
-- =========================================================================

-- =========================================================================
-- SECTION 1: subscriptions テーブル
-- =========================================================================
-- 現在: "Service role can manage subscriptions" は roles={public} で
--       USING ((select auth.role()) = 'service_role') を使用
-- 修正: service_role ロールに直接適用

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;

-- Userポリシー（authenticatedロールに適用）
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Service roleポリシー（service_roleロールに適用）
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================================
-- SECTION 2: hotsure_purchases テーブル
-- =========================================================================
DROP POLICY IF EXISTS "Service role can manage purchases" ON hotsure_purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON hotsure_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON hotsure_purchases;

-- Userポリシー（authenticatedロールに適用）
CREATE POLICY "Users can view own purchases"
  ON hotsure_purchases FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own purchases"
  ON hotsure_purchases FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Service roleポリシー（service_roleロールに適用）
CREATE POLICY "Service role can manage purchases"
  ON hotsure_purchases FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================================
-- SECTION 3: users テーブル
-- =========================================================================
-- "Users can view profiles" (qual: true) が存在するため
-- "Users can view own profile" は冗長 → 削除

DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- 注: "Users can view profiles" はソーシャル機能で他ユーザーのプロファイルを
-- 表示するために必要なため、そのまま維持
