-- テーブルの存在確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'toilet_paper_products'
);

-- テーブルの構造確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'toilet_paper_products'
ORDER BY ordinal_position;

-- データ件数確認
SELECT COUNT(*) as record_count FROM toilet_paper_products;

-- 最新10件のデータ確認
SELECT asin, title, price, price_per_m, updated_at
FROM toilet_paper_products
ORDER BY updated_at DESC
LIMIT 10;