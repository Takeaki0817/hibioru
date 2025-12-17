-- ほつれ週次リセットRPC関数
-- 毎週月曜0:00 JSTに実行
-- 全ユーザーのほつれを2にリセットし、使用履歴をクリア

CREATE OR REPLACE FUNCTION reset_hotsure_weekly()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_rows INTEGER;
  v_batch_id UUID;
BEGIN
  -- 全ユーザーのほつれをリセット
  UPDATE streaks
  SET
    hotsure_remaining = 2,
    hotsure_used_dates = '{}'
  WHERE TRUE;

  -- 影響を受けた行数を取得
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  -- バッチログに記録
  INSERT INTO batch_logs (
    batch_name,
    status,
    affected_rows,
    metadata
  )
  VALUES (
    'reset_hotsure_weekly',
    'success',
    v_affected_rows,
    jsonb_build_object(
      'reset_date', CURRENT_DATE AT TIME ZONE 'Asia/Tokyo',
      'executed_at_jst', NOW() AT TIME ZONE 'Asia/Tokyo'
    )
  )
  RETURNING id INTO v_batch_id;

  -- 結果を返す
  RETURN jsonb_build_object(
    'success', true,
    'affected_users', v_affected_rows,
    'batch_log_id', v_batch_id,
    'reset_date', CURRENT_DATE AT TIME ZONE 'Asia/Tokyo'
  );

EXCEPTION WHEN OTHERS THEN
  -- エラー時もログに記録
  INSERT INTO batch_logs (
    batch_name,
    status,
    error_message,
    metadata
  )
  VALUES (
    'reset_hotsure_weekly',
    'failed',
    SQLERRM,
    jsonb_build_object(
      'reset_date', CURRENT_DATE AT TIME ZONE 'Asia/Tokyo',
      'error_code', SQLSTATE
    )
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- コメント
COMMENT ON FUNCTION reset_hotsure_weekly IS '週次ほつれリセット（毎週月曜0:00 JST実行想定）';
