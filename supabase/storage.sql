-- Supabase Storageバケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- RLSポリシー: 誰でも読み取り可能
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'images');

-- RLSポリシー: 認証済みユーザーのみアップロード可能
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' AND
  auth.role() = 'authenticated'
);

-- RLSポリシー: 認証済みユーザーは自分のファイルを削除可能
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'images' AND
  auth.uid() = owner
);
