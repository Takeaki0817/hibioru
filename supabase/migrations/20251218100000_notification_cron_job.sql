-- ========================================
-- 通知配信cronジョブ
-- ========================================
-- 毎分実行のpg_cronジョブを登録し、Edge Functionを呼び出します。
--
-- タスク11.2: pg_cronジョブの設定
--
-- Requirements:
-- - 5.4: 非同期実行（バックグラウンドジョブ）
--
-- 実行タイミング: 毎分（* * * * *）
-- 目的: 配信対象ユーザーを特定してプッシュ通知を送信

-- 必要な拡張機能を有効化
-- pg_netとpg_cronはSupabaseで事前に有効化されている
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ========================================
-- Vaultにシークレットを保存
-- ========================================
-- 注意: 本番環境では、これらのシークレットは
-- Supabase Dashboardまたは supabase secrets set コマンドで設定します。
-- このマイグレーションでは、開発環境用のプレースホルダーを設定します。

-- 既存のシークレットを削除（冪等性確保）
DO $$
BEGIN
  -- project_urlシークレットが存在すれば何もしない（既に設定済み）
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url'
  ) THEN
    -- 開発環境用のダミー値（本番では環境変数から設定）
    PERFORM vault.create_secret(
      'http://127.0.0.1:54321',
      'project_url',
      'Supabase project URL for Edge Function calls'
    );
  END IF;

  -- service_role_keyシークレットが存在すれば何もしない
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key'
  ) THEN
    -- 開発環境用のダミー値（本番では環境変数から設定）
    PERFORM vault.create_secret(
      'your-service-role-key',
      'service_role_key',
      'Supabase service role key for Edge Function authentication'
    );
  END IF;
END $$;

-- ========================================
-- 既存のジョブを削除（冪等性確保）
-- ========================================
SELECT cron.unschedule('send-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-notifications'
);

-- ========================================
-- 通知配信cronジョブの登録
-- ========================================
-- 毎分実行（* * * * *）
-- Edge Function: /functions/v1/send-notifications
-- 認証: Service Role Key（Vaultから取得）

SELECT cron.schedule(
  'send-notifications',
  '* * * * *', -- 毎分実行
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ========================================
-- ジョブ登録確認用コメント
-- ========================================
COMMENT ON TABLE notification_logs IS '通知送信履歴（pg_cronで毎分Edge Functionから更新）';
