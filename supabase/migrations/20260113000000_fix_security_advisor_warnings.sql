-- Security Advisor 警告対応
-- 1. 全関数に SET search_path = '' を追加
-- 2. rate_limits テーブルに RLS ポリシー追加
-- 3. pg_net 拡張を extensions スキーマに移動

-- ========================================
-- 1. 関数の search_path 設定追加（10関数）
-- ========================================

-- 1-1. generate_username_from_email
CREATE OR REPLACE FUNCTION public.generate_username_from_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base_username TEXT;
  new_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- emailの@以前を取得し、無効な文字を除去
  base_username := regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');

  -- 3文字未満の場合はランダム文字を追加
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user' || floor(random() * 1000)::text;
  END IF;

  -- 20文字を超える場合は切り詰め
  IF length(base_username) > 20 THEN
    base_username := substring(base_username from 1 for 20);
  END IF;

  new_username := base_username;

  -- 重複チェックと連番付与
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := substring(base_username from 1 for (20 - length(counter::text))) || counter::text;
  END LOOP;

  NEW.username := new_username;
  RETURN NEW;
END;
$$;

-- 1-2. update_achievements_updated_at
CREATE OR REPLACE FUNCTION public.update_achievements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1-3. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- usersテーブルに挿入
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- streaksテーブルに初期値を挿入
  INSERT INTO public.streaks (
    user_id,
    current_streak,
    longest_streak,
    last_entry_date,
    hotsure_remaining,
    hotsure_used_dates
  )
  VALUES (
    NEW.id,
    0,
    0,
    NULL,
    2,
    '{}'
  );

  -- notification_settingsテーブルに初期値を挿入
  INSERT INTO public.notification_settings (
    user_id,
    enabled,
    reminders,
    chase_reminder_enabled,
    chase_reminder_delay_minutes
  )
  VALUES (
    NEW.id,
    FALSE,
    '[{"time": "21:00", "enabled": true}, {"time": null, "enabled": false}, {"time": null, "enabled": false}, {"time": null, "enabled": false}, {"time": null, "enabled": false}]'::jsonb,
    TRUE,
    60
  );

  RETURN NEW;
END;
$$;

-- 1-4. check_hotsure_purchase_allowed
CREATE OR REPLACE FUNCTION public.check_hotsure_purchase_allowed(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total INTEGER;
  v_max_total INTEGER := 2;
BEGIN
  -- FOR UPDATEでロックを取得
  SELECT COALESCE(hotsure_remaining, 0) + COALESCE(bonus_hotsure, 0)
  INTO v_total
  FROM public.streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_total IS NULL THEN
    v_total := 0;
  END IF;

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

-- 1-5. check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
  v_oldest_in_window TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_oldest_in_window
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at > v_window_start;

  IF v_count >= p_limit THEN
    v_reset_at := v_oldest_in_window + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN jsonb_build_object(
      'success', false,
      'remaining', 0,
      'reset_at', v_reset_at
    );
  END IF;

  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (p_user_id, p_action_type);

  RETURN jsonb_build_object(
    'success', true,
    'remaining', p_limit - v_count - 1,
    'reset_at', now() + (p_window_seconds || ' seconds')::INTERVAL
  );
END;
$$;

-- 1-6. cleanup_old_rate_limits
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

-- 1-7. process_daily_streak
CREATE OR REPLACE FUNCTION public.process_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_yesterday DATE;
  v_today DATE;
  v_user_record RECORD;
  v_has_entry BOOLEAN;
  v_processed_count INTEGER := 0;
  v_hotsure_consumed_count INTEGER := 0;
  v_bonus_hotsure_consumed_count INTEGER := 0;
  v_streak_broken_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_batch_id UUID;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Tokyo')::date;
  v_yesterday := v_today - 1;

  FOR v_user_record IN
    SELECT
      s.user_id,
      s.current_streak,
      s.hotsure_remaining,
      s.bonus_hotsure,
      s.last_entry_date
    FROM public.streaks s
    WHERE s.last_entry_date IS NULL OR s.last_entry_date < v_yesterday
  LOOP
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM public.entries e
        WHERE e.user_id = v_user_record.user_id
          AND e.is_deleted = FALSE
          AND DATE(e.created_at AT TIME ZONE 'Asia/Tokyo') = v_yesterday
      ) INTO v_has_entry;

      IF NOT v_has_entry THEN
        IF v_user_record.hotsure_remaining > 0 THEN
          UPDATE public.streaks
          SET
            hotsure_remaining = hotsure_remaining - 1,
            hotsure_used_dates = array_append(hotsure_used_dates, v_yesterday)
          WHERE user_id = v_user_record.user_id;

          v_hotsure_consumed_count := v_hotsure_consumed_count + 1;
        ELSIF v_user_record.bonus_hotsure > 0 THEN
          UPDATE public.streaks
          SET
            bonus_hotsure = bonus_hotsure - 1,
            hotsure_used_dates = array_append(hotsure_used_dates, v_yesterday)
          WHERE user_id = v_user_record.user_id;

          v_bonus_hotsure_consumed_count := v_bonus_hotsure_consumed_count + 1;
        ELSE
          UPDATE public.streaks
          SET current_streak = 0
          WHERE user_id = v_user_record.user_id;

          v_streak_broken_count := v_streak_broken_count + 1;
        END IF;

        v_processed_count := v_processed_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'user_id', v_user_record.user_id,
        'error', SQLERRM,
        'error_code', SQLSTATE
      );
    END;
  END LOOP;

  INSERT INTO public.batch_logs (
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
      'bonus_hotsure_consumed', v_bonus_hotsure_consumed_count,
      'streaks_broken', v_streak_broken_count,
      'errors', v_error_count,
      'error_details', v_errors
    )
  )
  RETURNING id INTO v_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batch_log_id', v_batch_id,
    'target_date', v_yesterday,
    'processed_users', v_processed_count,
    'hotsure_consumed', v_hotsure_consumed_count,
    'bonus_hotsure_consumed', v_bonus_hotsure_consumed_count,
    'streaks_broken', v_streak_broken_count,
    'errors', v_error_count
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.batch_logs (
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

-- 1-8. reset_hotsure_weekly
CREATE OR REPLACE FUNCTION public.reset_hotsure_weekly()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_affected_rows INTEGER;
  v_batch_id UUID;
BEGIN
  UPDATE public.streaks
  SET
    hotsure_remaining = 2,
    hotsure_used_dates = '{}'
  WHERE TRUE;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  INSERT INTO public.batch_logs (
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

  RETURN jsonb_build_object(
    'success', true,
    'affected_users', v_affected_rows,
    'batch_log_id', v_batch_id,
    'reset_date', CURRENT_DATE AT TIME ZONE 'Asia/Tokyo'
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.batch_logs (
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

-- 1-9. consume_hotsure
CREATE OR REPLACE FUNCTION public.consume_hotsure(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_remaining INTEGER;
  v_used_dates DATE[];
  v_today DATE;
BEGIN
  v_today := CURRENT_DATE AT TIME ZONE 'Asia/Tokyo';

  SELECT
    hotsure_remaining,
    hotsure_used_dates
  INTO
    v_current_remaining,
    v_used_dates
  FROM public.streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User streak record not found'
    );
  END IF;

  IF v_current_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No hotsure remaining'
    );
  END IF;

  IF v_today = ANY(v_used_dates) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hotsure already used today'
    );
  END IF;

  UPDATE public.streaks
  SET
    hotsure_remaining = hotsure_remaining - 1,
    hotsure_used_dates = array_append(hotsure_used_dates, v_today)
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_current_remaining - 1,
    'used_date', v_today
  );
END;
$$;

-- 1-10. update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ========================================
-- 2. rate_limits テーブルの RLS ポリシー追加
-- ========================================

-- サービスロールのみアクセス可（通常ユーザーは全拒否）
-- RLSが有効だがポリシーがない状態を解消
CREATE POLICY "Service role only" ON public.rate_limits
  FOR ALL
  USING (false);

-- ========================================
-- 3. pg_net 拡張を extensions スキーマに移動
-- ========================================

-- extensions スキーマが存在しない場合は作成
CREATE SCHEMA IF NOT EXISTS extensions;

-- 拡張を移動（DROP後に extensions スキーマで再作成）
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net SCHEMA extensions;

-- コメント
COMMENT ON FUNCTION public.generate_username_from_email IS 'usernameを自動生成（search_path保護済）';
COMMENT ON FUNCTION public.update_achievements_updated_at IS 'achievements.updated_at自動更新（search_path保護済）';
COMMENT ON FUNCTION public.handle_new_user IS '新規ユーザー初期化処理（search_path保護済）';
COMMENT ON FUNCTION public.check_hotsure_purchase_allowed(UUID) IS 'ほつれ購入可否チェック（search_path保護済）';
COMMENT ON FUNCTION public.check_rate_limit(UUID, TEXT, INT, INT) IS 'レート制限チェック（search_path保護済）';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS '古いレート制限レコード削除（search_path保護済）';
COMMENT ON FUNCTION public.process_daily_streak IS '日次ストリーク判定処理（search_path保護済）';
COMMENT ON FUNCTION public.reset_hotsure_weekly IS '週次ほつれリセット（search_path保護済）';
COMMENT ON FUNCTION public.consume_hotsure(UUID) IS 'ほつれ消費（search_path保護済）';
COMMENT ON FUNCTION public.update_updated_at IS 'updated_at自動更新（search_path保護済）';
