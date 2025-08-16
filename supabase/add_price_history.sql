-- 前回の単価を記録するカラムを追加
ALTER TABLE toilet_paper_products 
ADD COLUMN IF NOT EXISTS last_price_per_m NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS last_price_per_roll NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN DEFAULT FALSE;

-- 価格履歴テーブルを作成
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(20) NOT NULL,
    price INTEGER,
    price_per_m NUMERIC(10,2),
    price_per_roll NUMERIC(10,2),
    roll_count INTEGER,
    length_m NUMERIC(10,2),
    total_length_m NUMERIC(10,2),
    on_sale BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asin) REFERENCES toilet_paper_products(asin)
);

-- 価格履歴のインデックス
CREATE INDEX idx_price_history_asin ON price_history(asin);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);