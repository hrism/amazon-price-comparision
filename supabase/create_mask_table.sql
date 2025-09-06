-- マスク商品テーブル
CREATE TABLE IF NOT EXISTS mask_products (
  asin VARCHAR(20) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  image_url TEXT,
  price INTEGER,
  price_regular INTEGER,
  discount_percent NUMERIC(5,2),
  on_sale BOOLEAN DEFAULT false,
  review_avg NUMERIC(3,2),
  review_count INTEGER,
  mask_count INTEGER, -- 枚数
  price_per_mask NUMERIC(10,2), -- 1枚あたりの価格
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_mask_price_per_mask ON mask_products(price_per_mask);
CREATE INDEX IF NOT EXISTS idx_mask_on_sale ON mask_products(on_sale);
CREATE INDEX IF NOT EXISTS idx_mask_review_avg ON mask_products(review_avg);
CREATE INDEX IF NOT EXISTS idx_mask_last_fetched ON mask_products(last_fetched_at DESC);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_mask_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mask_updated_at
BEFORE UPDATE ON mask_products
FOR EACH ROW
EXECUTE FUNCTION update_mask_updated_at();