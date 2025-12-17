-- entry-imagesバケットを作成
-- 画像は非公開で、認証済みユーザーのみアクセス可能

INSERT INTO storage.buckets (id, name, public)
VALUES ('entry-images', 'entry-images', false);

-- RLSポリシー: ユーザーは自分のフォルダにのみアップロード可能
-- パス構造: {user_id}/{timestamp}_{random}.webp
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entry-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLSポリシー: ユーザーは自分のファイルのみ読み取り可能
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entry-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLSポリシー: ユーザーは自分のファイルのみ削除可能
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entry-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLSポリシー: ユーザーは自分のファイルのみ更新可能
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'entry-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
