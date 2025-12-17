-- 新規ユーザー初期化トリガー
-- auth.usersにユーザーが作成されたとき、自動的にusersとstreaksテーブルに初期データを挿入

-- 新規ユーザー初期化関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
    2,  -- ほつれ初期値: 週2回付与
    '{}'  -- 使用履歴は空配列
  );

  -- notification_settingsテーブルに初期値を挿入
  INSERT INTO public.notification_settings (
    user_id,
    enabled,
    main_reminder_time,
    chase_reminder_enabled,
    chase_reminder_delay_minutes
  )
  VALUES (
    NEW.id,
    TRUE,
    '21:00',  -- デフォルトのリマインド時刻
    TRUE,
    60  -- 追いリマインドは1時間後
  );

  RETURN NEW;
END;
$$;

-- トリガーを作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- コメント
COMMENT ON FUNCTION handle_new_user IS '新規ユーザー作成時の初期化処理（users, streaks, notification_settings）';
