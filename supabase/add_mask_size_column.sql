-- マスクサイズカラムを追加
ALTER TABLE mask_products 
ADD COLUMN IF NOT EXISTS mask_size VARCHAR(50);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_mask_size ON mask_products(mask_size);

-- サイズの種類:
-- 'large' - 大きめ、大きいサイズ、Lサイズ
-- 'regular' - ふつう、普通サイズ、レギュラー、Mサイズ
-- 'small' - 小さめ、小さいサイズ、Sサイズ
-- 'kids' - 子供用、こども用、キッズ
-- NULL - サイズ表記なし