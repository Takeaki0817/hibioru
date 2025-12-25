-- main_reminder_time カラムを削除
-- reminders 配列への移行が完了したため不要

ALTER TABLE notification_settings
DROP COLUMN IF EXISTS main_reminder_time;

COMMENT ON TABLE notification_settings IS 'ユーザーの通知設定。reminders配列で複数リマインド時刻を管理';

-- トリガー関数を更新（main_reminder_time の代わりに reminders を使用）
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

  -- notification_settingsテーブルに初期値を挿入（reminders配列を使用）
  INSERT INTO public.notification_settings (
    user_id,
    enabled,
    reminders,
    chase_reminder_enabled,
    chase_reminder_delay_minutes
  )
  VALUES (
    NEW.id,
    FALSE,  -- デフォルトは無効
    '[{"time": "21:00", "enabled": true}, {"time": null, "enabled": false}, {"time": null, "enabled": false}, {"time": null, "enabled": false}, {"time": null, "enabled": false}]'::jsonb,
    TRUE,
    60  -- 追いリマインドは1時間後
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS '新規ユーザー作成時の初期化処理（users, streaks, notification_settings）';
