-- 食器用洗剤テーブルの作成
CREATE TABLE IF NOT EXISTS dishwashing_liquid_products (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    brand VARCHAR(255),
    image_url TEXT,
    price INTEGER,
    price_regular INTEGER,
    discount_percent INTEGER,
    on_sale BOOLEAN DEFAULT FALSE,
    review_avg DECIMAL(2,1),
    review_count INTEGER,
    volume_ml INTEGER,  -- 容量（ml）
    price_per_1000ml DECIMAL(10,2),  -- 1000ml単価
    is_refill BOOLEAN,  -- 詰め替え用かどうか
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_dishwashing_liquid_asin ON dishwashing_liquid_products(asin);
CREATE INDEX IF NOT EXISTS idx_dishwashing_liquid_price_per_1000ml ON dishwashing_liquid_products(price_per_1000ml);
CREATE INDEX IF NOT EXISTS idx_dishwashing_liquid_is_refill ON dishwashing_liquid_products(is_refill);
CREATE INDEX IF NOT EXISTS idx_dishwashing_liquid_on_sale ON dishwashing_liquid_products(on_sale);

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_dishwashing_liquid_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dishwashing_liquid_updated_at_trigger
BEFORE UPDATE ON dishwashing_liquid_products
FOR EACH ROW
EXECUTE FUNCTION update_dishwashing_liquid_updated_at();