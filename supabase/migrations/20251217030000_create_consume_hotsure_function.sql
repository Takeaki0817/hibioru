-- ほつれ自動消費RPC関数
-- ストリークが途切れそうな日にほつれを1つ消費する
-- FOR UPDATE により同時実行を防止

CREATE OR REPLACE FUNCTION consume_hotsure(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_remaining INTEGER;
  v_used_dates DATE[];
  v_today DATE;
BEGIN
  -- 日本時間で今日の日付を取得
  v_today := CURRENT_DATE AT TIME ZONE 'Asia/Tokyo';

  -- FOR UPDATE でロックを取得（同時実行防止）
  SELECT
    hotsure_remaining,
    hotsure_used_dates
  INTO
    v_current_remaining,
    v_used_dates
  FROM streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- レコードが存在しない場合
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User streak record not found'
    );
  END IF;

  -- ほつれが残っていない場合
  IF v_current_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No hotsure remaining'
    );
  END IF;

  -- 今日既に使用済みの場合
  IF v_today = ANY(v_used_dates) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hotsure already used today'
    );
  END IF;

  -- ほつれを消費
  UPDATE streaks
  SET
    hotsure_remaining = hotsure_remaining - 1,
    hotsure_used_dates = array_append(hotsure_used_dates, v_today)
  WHERE user_id = p_user_id;

  -- 消費後の残り回数を返す
  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_current_remaining - 1,
    'used_date', v_today
  );
END;
$$;

-- コメント
COMMENT ON FUNCTION consume_hotsure IS 'ほつれを1つ消費する（同時実行安全）';
