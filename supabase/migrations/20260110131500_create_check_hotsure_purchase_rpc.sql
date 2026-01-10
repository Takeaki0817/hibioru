-- ほつれ購入の競合状態対策用RPC関数
-- FOR UPDATEでロックを取得し、同時実行を防止

CREATE OR REPLACE FUNCTION check_hotsure_purchase_allowed(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_max_total INTEGER := 2;
BEGIN
  -- FOR UPDATEでロックを取得（同時実行時は待機）
  SELECT COALESCE(hotsure_remaining, 0) + COALESCE(bonus_hotsure, 0)
  INTO v_total
  FROM streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- streaksレコードが存在しない場合は0として扱う
  IF v_total IS NULL THEN
    v_total := 0;
  END IF;

  -- 上限チェック
  IF v_total >= v_max_total THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', v_total,
      'message', 'ほつれは2個以上持てません'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current', v_total
  );
END;
$$;

-- コメント追加
COMMENT ON FUNCTION check_hotsure_purchase_allowed(UUID) IS 'ほつれ購入可否をチェック（FOR UPDATEで競合状態を防止）';
