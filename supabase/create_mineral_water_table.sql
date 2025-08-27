-- ミネラルウォーター商品テーブル
CREATE TABLE IF NOT EXISTS mineral_water_products (
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
  volume_ml INTEGER, -- 容量（ml）
  bottle_count INTEGER, -- 本数
  total_volume_ml INTEGER, -- 総容量（ml）
  price_per_liter NUMERIC(10,2), -- 1リットルあたりの価格
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_mineral_water_price_per_liter ON mineral_water_products(price_per_liter);
CREATE INDEX IF NOT EXISTS idx_mineral_water_on_sale ON mineral_water_products(on_sale);
CREATE INDEX IF NOT EXISTS idx_mineral_water_review_avg ON mineral_water_products(review_avg);
CREATE INDEX IF NOT EXISTS idx_mineral_water_last_fetched ON mineral_water_products(last_fetched_at DESC);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_mineral_water_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mineral_water_updated_at
BEFORE UPDATE ON mineral_water_products
FOR EACH ROW
EXECUTE FUNCTION update_mineral_water_updated_at();