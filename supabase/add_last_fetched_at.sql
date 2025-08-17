-- toilet_paper_productsテーブルにlast_fetched_atカラムを追加
ALTER TABLE toilet_paper_products 
ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ;

-- dishwashing_liquid_productsテーブルにlast_fetched_atカラムを追加
ALTER TABLE dishwashing_liquid_products 
ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ;

-- インデックスを追加（検索性能向上のため）
CREATE INDEX IF NOT EXISTS idx_toilet_paper_last_fetched 
ON toilet_paper_products(last_fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_dishwashing_last_fetched 
ON dishwashing_liquid_products(last_fetched_at DESC);