-- レート制限テーブル（Supabase版）
-- Upstash不要でレート制限を実現

-- レート制限ログテーブル
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 高速検索用インデックス
CREATE INDEX idx_rate_limits_lookup
  ON rate_limits(user_id, action_type, created_at DESC);

-- RLS有効化（サービスロールのみアクセス）
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- レート制限チェック関数
-- 制限内ならレコードを追加してtrue、超過ならfalseを返す
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
  v_oldest_in_window TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- ウィンドウ開始時刻を計算
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

  -- 現在のウィンドウ内のリクエスト数をカウント
  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_oldest_in_window
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at > v_window_start;

  -- 制限超過チェック
  IF v_count >= p_limit THEN
    -- リセット時刻を計算（最古のレコード + ウィンドウ時間）
    v_reset_at := v_oldest_in_window + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN jsonb_build_object(
      'success', false,
      'remaining', 0,
      'reset_at', v_reset_at
    );
  END IF;

  -- 制限内なら新しいレコードを追加
  INSERT INTO rate_limits (user_id, action_type)
  VALUES (p_user_id, p_action_type);

  RETURN jsonb_build_object(
    'success', true,
    'remaining', p_limit - v_count - 1,
    'reset_at', now() + (p_window_seconds || ' seconds')::INTERVAL
  );
END;
$$;

-- 古いレート制限レコードを削除する関数（1時間以上前のもの）
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

-- 定期クリーンアップジョブ（1時間ごと）
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',  -- 毎時0分
  $$SELECT cleanup_old_rate_limits()$$
);

-- コメント
COMMENT ON TABLE rate_limits IS 'レート制限ログ（スライディングウィンドウ方式）';
COMMENT ON FUNCTION check_rate_limit(UUID, TEXT, INT, INT) IS 'レート制限チェック: 制限内ならtrue、超過ならfalse';
COMMENT ON FUNCTION cleanup_old_rate_limits() IS '古いレート制限レコードの定期削除';
