-- 各テーブルにtotal_scoreカラムを追加

-- トイレットペーパー
ALTER TABLE toilet_paper_products
ADD COLUMN IF NOT EXISTS total_score DECIMAL(3,2) DEFAULT NULL;

-- 食器用洗剤
ALTER TABLE dishwashing_liquid_products
ADD COLUMN IF NOT EXISTS total_score DECIMAL(3,2) DEFAULT NULL;

-- ミネラルウォーター
ALTER TABLE mineral_water_products
ADD COLUMN IF NOT EXISTS total_score DECIMAL(3,2) DEFAULT NULL;

-- インデックスを追加（総合点でのソートを高速化）
CREATE INDEX IF NOT EXISTS idx_toilet_paper_total_score ON toilet_paper_products(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_dishwashing_total_score ON dishwashing_liquid_products(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_mineral_water_total_score ON mineral_water_products(total_score DESC);

-- コメント追加
COMMENT ON COLUMN toilet_paper_products.total_score IS '総合点スコア（0-5点、レビュー70%・価格30%の重み付け）';
COMMENT ON COLUMN dishwashing_liquid_products.total_score IS '総合点スコア（0-5点、レビュー70%・価格30%の重み付け）';
COMMENT ON COLUMN mineral_water_products.total_score IS '総合点スコア（0-5点、レビュー70%・価格30%の重み付け）';