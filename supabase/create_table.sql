-- toilet_paper_productsテーブルの作成
CREATE TABLE IF NOT EXISTS toilet_paper_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asin TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    image_url TEXT,
    price INTEGER,                -- 販売価格（セール適用後）
    price_regular INTEGER,        -- 通常価格（割引前）
    discount_percent INTEGER,     -- 割引率
    on_sale BOOLEAN DEFAULT FALSE,              -- セール中フラグ
    review_avg NUMERIC(2,1),
    review_count INTEGER,
    roll_count INTEGER,
    length_m NUMERIC(5,1),
    total_length_m NUMERIC(7,1),
    price_per_roll NUMERIC(7,2),
    price_per_m NUMERIC(7,3),
    is_double BOOLEAN,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_toilet_paper_products_updated_at ON toilet_paper_products(updated_at DESC);
CREATE INDEX idx_toilet_paper_products_price_per_m ON toilet_paper_products(price_per_m);
CREATE INDEX idx_toilet_paper_products_is_double ON toilet_paper_products(is_double);
CREATE INDEX idx_toilet_paper_products_on_sale ON toilet_paper_products(on_sale);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_toilet_paper_products_updated_at 
BEFORE UPDATE ON toilet_paper_products 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();