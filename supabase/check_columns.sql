-- テーブルの列情報を詳しく確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'toilet_paper_products'
ORDER BY ordinal_position;