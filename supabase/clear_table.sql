-- テーブルのデータをクリア
DELETE FROM toilet_paper_products;

-- 削除後の件数確認
SELECT COUNT(*) as record_count FROM toilet_paper_products;