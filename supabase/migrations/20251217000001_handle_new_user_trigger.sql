-- 新規ユーザー作成トリガー
-- auth.usersへの挿入時に自動的にpublic.usersとstreaksにレコードを作成

-- トリガー関数: auth.usersへの挿入時にpublic.usersとstreaksに自動挿入
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- usersテーブルにレコード作成
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- streaksテーブルにレコード作成（初期値）
  INSERT INTO public.streaks (
    user_id,
    current_streak,
    longest_streak,
    last_entry_date,
    hotsure_remaining,
    hotsure_used_dates
  ) VALUES (
    NEW.id,
    0,
    0,
    NULL,
    2,
    '{}'::date[]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー: auth.usersへの挿入後に実行
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
