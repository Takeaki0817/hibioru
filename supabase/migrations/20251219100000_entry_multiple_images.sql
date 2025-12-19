-- 複数画像対応: image_url TEXT → image_urls TEXT[]

-- 1. 新しいカラムを追加
ALTER TABLE entries ADD COLUMN image_urls TEXT[];

-- 2. 既存データを移行（image_urlがある場合は配列に変換）
UPDATE entries
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL;

-- 3. 古いカラムを削除
ALTER TABLE entries DROP COLUMN image_url;

-- コメント追加
COMMENT ON COLUMN entries.image_urls IS '画像URL配列（最大2枚）';
