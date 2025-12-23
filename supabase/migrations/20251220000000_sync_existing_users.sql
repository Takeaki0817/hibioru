-- 既存のauth.usersをpublic.usersに同期
-- トリガー適用前に登録されたユーザーのデータを作成

-- 1. 既存のauth.usersでpublic.usersに存在しないユーザーを挿入
INSERT INTO public.users (id, email, display_name, avatar_url)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 2. 既存のユーザーでstreaksに存在しないレコードを挿入
INSERT INTO public.streaks (
  user_id,
  current_streak,
  longest_streak,
  last_entry_date,
  hotsure_remaining,
  hotsure_used_dates
)
SELECT
  u.id,
  0,
  0,
  NULL,
  2,
  '{}'
FROM public.users u
LEFT JOIN public.streaks s ON u.id = s.user_id
WHERE s.user_id IS NULL;

-- 3. 既存のユーザーでnotification_settingsに存在しないレコードを挿入
INSERT INTO public.notification_settings (
  user_id,
  enabled,
  main_reminder_time,
  chase_reminder_enabled,
  chase_reminder_delay_minutes
)
SELECT
  u.id,
  TRUE,
  '21:00',
  TRUE,
  60
FROM public.users u
LEFT JOIN public.notification_settings ns ON u.id = ns.user_id
WHERE ns.user_id IS NULL;
