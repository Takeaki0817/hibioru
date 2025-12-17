-- 日次ストリーク判定バッチ関数
-- 毎日0:00 JSTに実行
-- 前日に記録がないユーザーに対してほつれ消費またはストリーク途切れ処理を実行

CREATE OR REPLACE FUNCTION process_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_yesterday DATE;
  v_today DATE;
  v_user_record RECORD;
  v_has_entry BOOLEAN;
  v_processed_count INTEGER := 0;
  v_hotsure_consumed_count INTEGER := 0;
  v_streak_broken_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_batch_id UUID;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  -- 日本時間で昨日と今日の日付を取得
  v_yesterday := (CURRENT_DATE - INTERVAL '1 day') AT TIME ZONE 'Asia/Tokyo';
  v_today := CURRENT_DATE AT TIME ZONE 'Asia/Tokyo';

  -- 前日に記録がない可能性のあるユーザーを対象
  -- (last_entry_date < 昨日 のユーザー、またはNULLのユーザー)
  FOR v_user_record IN
    SELECT
      s.user_id,
      s.current_streak,
      s.hotsure_remaining,
      s.last_entry_date
    FROM streaks s
    WHERE s.last_entry_date IS NULL OR s.last_entry_date < v_yesterday
  LOOP
    BEGIN
      -- 昨日の記録の有無を確認
      SELECT EXISTS (
        SELECT 1
        FROM entries e
        WHERE e.user_id = v_user_record.user_id
          AND e.is_deleted = FALSE
          AND DATE(e.created_at AT TIME ZONE 'Asia/Tokyo') = v_yesterday
      ) INTO v_has_entry;

      -- 昨日の記録がない場合
      IF NOT v_has_entry THEN
        -- ほつれが残っている場合は消費
        IF v_user_record.hotsure_remaining > 0 THEN
          UPDATE streaks
          SET
            hotsure_remaining = hotsure_remaining - 1,
            hotsure_used_dates = array_append(hotsure_used_dates, v_yesterday)
          WHERE user_id = v_user_record.user_id;

          v_hotsure_consumed_count := v_hotsure_consumed_count + 1;
        -- ほつれがない場合はストリークを途切れさせる
        ELSE
          UPDATE streaks
          SET current_streak = 0
          WHERE user_id = v_user_record.user_id;

          v_streak_broken_count := v_streak_broken_count + 1;
        END IF;

        v_processed_count := v_processed_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- 個別ユーザーのエラーはスキップして継続
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'user_id', v_user_record.user_id,
        'error', SQLERRM,
        'error_code', SQLSTATE
      );
    END;
  END LOOP;

  -- バッチログに記録
  INSERT INTO batch_logs (
    batch_name,
    status,
    affected_rows,
    metadata
  )
  VALUES (
    'process_daily_streak',
    CASE WHEN v_error_count = 0 THEN 'success' ELSE 'partial_failure' END,
    v_processed_count,
    jsonb_build_object(
      'target_date', v_yesterday,
      'executed_at_jst', NOW() AT TIME ZONE 'Asia/Tokyo',
      'processed_users', v_processed_count,
      'hotsure_consumed', v_hotsure_consumed_count,
      'streaks_broken', v_streak_broken_count,
      'errors', v_error_count,
      'error_details', v_errors
    )
  )
  RETURNING id INTO v_batch_id;

  -- 結果を返す
  RETURN jsonb_build_object(
    'success', true,
    'batch_log_id', v_batch_id,
    'target_date', v_yesterday,
    'processed_users', v_processed_count,
    'hotsure_consumed', v_hotsure_consumed_count,
    'streaks_broken', v_streak_broken_count,
    'errors', v_error_count
  );

EXCEPTION WHEN OTHERS THEN
  -- 全体エラー時もログに記録
  INSERT INTO batch_logs (
    batch_name,
    status,
    error_message,
    metadata
  )
  VALUES (
    'process_daily_streak',
    'failed',
    SQLERRM,
    jsonb_build_object(
      'target_date', v_yesterday,
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
COMMENT ON FUNCTION process_daily_streak IS '日次ストリーク判定処理（毎日0:00 JST実行想定）';
