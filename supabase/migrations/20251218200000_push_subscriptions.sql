-- Push購読テーブルにuser_agentカラムを追加（テーブルが既に存在する場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_subscriptions' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE push_subscriptions ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- RLSポリシー（存在しない場合のみ追加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users can manage own subscriptions'
  ) THEN
    CREATE POLICY "Users can manage own subscriptions"
      ON push_subscriptions
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Service role can access all subscriptions'
  ) THEN
    CREATE POLICY "Service role can access all subscriptions"
      ON push_subscriptions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
