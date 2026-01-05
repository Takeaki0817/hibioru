-- ソーシャル機能: usersテーブルにusernameカラムを追加
-- デフォルト値: emailの@以前を抽出

-- usernameカラムを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT;

-- 既存ユーザーにusernameを設定（emailの@以前を使用、無効な文字を除去）
UPDATE users
SET username = (
  SELECT
    CASE
      -- 20文字を超える場合は切り詰め
      WHEN length(sanitized) > 20 THEN substring(sanitized from 1 for 20)
      -- 3文字未満の場合はランダム文字を追加
      WHEN length(sanitized) < 3 THEN sanitized || 'user' || floor(random() * 1000)::text
      ELSE sanitized
    END
  FROM (
    -- 無効な文字を除去（英数字とアンダースコアのみ残す）
    SELECT regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g') AS sanitized
  ) AS s
)
WHERE username IS NULL;

-- ユニーク制約を追加（重複がある場合に備えて、まず重複を解消）
-- 重複するusernameには連番を付与
WITH duplicates AS (
  SELECT id, username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM users
  WHERE username IN (
    SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1
  )
)
UPDATE users
SET username = users.username || (duplicates.rn - 1)::text
FROM duplicates
WHERE users.id = duplicates.id AND duplicates.rn > 1;

-- NOT NULL制約とUNIQUE制約を追加
ALTER TABLE users
ALTER COLUMN username SET NOT NULL;

ALTER TABLE users
ADD CONSTRAINT users_username_unique UNIQUE (username);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_display_name_idx ON users(display_name);

-- usernameのバリデーション（英数字とアンダースコアのみ、3-20文字）
ALTER TABLE users
ADD CONSTRAINT users_username_format CHECK (
  username ~ '^[a-zA-Z0-9_]{3,20}$'
);

-- 新規ユーザー作成時にusernameを自動設定するトリガー関数
CREATE OR REPLACE FUNCTION generate_username_from_email()
RETURNS TRIGGER AS $$
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

  -- 重複チェックと連番付与（public.usersを明示的に指定）
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := substring(base_username from 1 for (20 - length(counter::text))) || counter::text;
  END LOOP;

  NEW.username := new_username;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（usernameがNULLの場合のみ発火）
DROP TRIGGER IF EXISTS set_username_on_insert ON users;
CREATE TRIGGER set_username_on_insert
  BEFORE INSERT ON users
  FOR EACH ROW
  WHEN (NEW.username IS NULL)
  EXECUTE FUNCTION generate_username_from_email();

-- RLSポリシー: 全ユーザーの公開情報（username, display_name, avatar_url）を閲覧可能にする
-- 既存のSELECTポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- 全ユーザーの公開情報は閲覧可能（SELECTは全員可能、取得カラムはクエリで制限）
CREATE POLICY "Users can view profiles"
  ON users FOR SELECT
  USING (true);

-- UPDATEは自分のみ
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN users.username IS 'ユニークなユーザーID（@username形式で表示）。英数字とアンダースコア、3-20文字';
