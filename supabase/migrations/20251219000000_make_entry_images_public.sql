-- entry-imagesバケットを公開に変更
-- タイムラインで画像を表示するため、公開アクセスが必要
UPDATE storage.buckets
SET public = true
WHERE id = 'entry-images';

-- 公開読み取りポリシーを追加
CREATE POLICY "Public can read files"
ON storage.objects FOR SELECT
USING (bucket_id = 'entry-images');
