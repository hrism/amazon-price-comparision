-- published_atがnullの記事を現在時刻で更新
UPDATE blog_posts
SET published_at = NOW()
WHERE status = 'published' 
AND published_at IS NULL;

-- 確認
SELECT id, title, slug, status, published_at, created_at
FROM blog_posts
ORDER BY created_at DESC;