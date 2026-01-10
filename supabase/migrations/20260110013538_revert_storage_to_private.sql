-- entry-imagesバケットを非公開に戻す
-- 非共有エントリの画像を保護するため

-- 1. バケットを非公開に変更
UPDATE storage.buckets
SET public = false
WHERE id = 'entry-images';

-- 2. 公開読み取りポリシーを削除
DROP POLICY IF EXISTS "Public can read files" ON storage.objects;

-- Note: 元のRLSポリシー（20251217100000_create_entry_images_bucket.sql）は有効なまま:
-- - "Users can upload to own folder"
-- - "Users can read own files"
-- - "Users can delete own files"
-- - "Users can update own files"
--
-- 署名付きURLはサーバーサイドで生成し、共有エントリの画像もアクセス可能にする
