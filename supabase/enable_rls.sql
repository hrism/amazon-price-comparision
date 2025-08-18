-- Row Level Security (RLS) を有効化するスクリプト
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- 1. 各テーブルでRLSを有効化
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilet_paper_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishwashing_liquid_products ENABLE ROW LEVEL SECURITY;

-- 2. 読み取り専用のポリシーを作成（すべてのユーザーが読み取り可能）
-- price_history テーブル
CREATE POLICY "Allow public read access" ON public.price_history
    FOR SELECT
    TO public
    USING (true);

-- toilet_paper_products テーブル
CREATE POLICY "Allow public read access" ON public.toilet_paper_products
    FOR SELECT
    TO public
    USING (true);

-- dishwashing_liquid_products テーブル
CREATE POLICY "Allow public read access" ON public.dishwashing_liquid_products
    FOR SELECT
    TO public
    USING (true);

-- 3. 書き込みは認証されたユーザーのみ（必要に応じて調整）
-- これらのポリシーは、サービスロール（GitHub Actions等）からの書き込みを許可します
-- 必要に応じて、より厳密な制限を追加できます

-- price_history テーブルの書き込みポリシー（サービスロールのみ）
CREATE POLICY "Service role can insert" ON public.price_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update" ON public.price_history
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- toilet_paper_products テーブルの書き込みポリシー（サービスロールのみ）
CREATE POLICY "Service role can insert" ON public.toilet_paper_products
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update" ON public.toilet_paper_products
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- dishwashing_liquid_products テーブルの書き込みポリシー（サービスロールのみ）
CREATE POLICY "Service role can insert" ON public.dishwashing_liquid_products
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update" ON public.dishwashing_liquid_products
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 注意: このスクリプトを実行した後、以下を確認してください：
-- 1. フロントエンドからデータが正常に読み取れる
-- 2. GitHub ActionsやPythonバックエンドからデータの書き込みができる
-- 3. 必要に応じてポリシーを調整する