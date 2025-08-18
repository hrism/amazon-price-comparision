-- シンプルなRLS有効化スクリプト（読み取り専用）
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- 1. 各テーブルでRLSを有効化
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilet_paper_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishwashing_liquid_products ENABLE ROW LEVEL SECURITY;

-- 2. すべてのユーザーに読み取りを許可
CREATE POLICY "Enable read access for all users" ON public.price_history
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.toilet_paper_products
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.dishwashing_liquid_products
    FOR SELECT USING (true);

-- 注意: 
-- このスクリプトは読み取り専用のアクセスを許可します。
-- 書き込みアクセスは、Supabaseのサービスロールキーを使用している
-- GitHub ActionsやPythonバックエンドからのみ可能になります。