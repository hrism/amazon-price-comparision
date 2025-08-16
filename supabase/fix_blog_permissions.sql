-- ブログ記事保存エラーの修正
-- SupabaseのSQL Editorで実行してください

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Users can manage own posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON blog_categories;
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON blog_tags;
DROP POLICY IF EXISTS "Authenticated users can manage post tags" ON blog_post_tags;

-- 認証済みユーザーが記事を作成できるポリシー
CREATE POLICY "Authenticated users can create posts" ON blog_posts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 自分の記事を更新・削除できるポリシー
CREATE POLICY "Users can update own posts" ON blog_posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts" ON blog_posts
    FOR DELETE USING (auth.uid() = author_id);

-- 認証済みユーザーは全ての記事を読める（管理画面用）
CREATE POLICY "Authenticated users can read all posts" ON blog_posts
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- カテゴリ・タグの管理ポリシー
CREATE POLICY "Authenticated can manage categories" ON blog_categories
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can manage tags" ON blog_tags
    FOR ALL USING (auth.uid() IS NOT NULL);

-- blog_post_tagsの管理ポリシー
CREATE POLICY "Authenticated can insert post tags" ON blog_post_tags
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete post tags" ON blog_post_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE blog_posts.id = blog_post_tags.post_id 
            AND blog_posts.author_id = auth.uid()
        )
    );

-- コンテンツフィールドのサイズ制限を確認（必要に応じて調整）
ALTER TABLE blog_posts ALTER COLUMN content TYPE TEXT;
ALTER TABLE blog_posts ALTER COLUMN excerpt TYPE TEXT;

-- インデックスの再作成
REINDEX TABLE blog_posts;
REINDEX TABLE blog_categories;
REINDEX TABLE blog_tags;
REINDEX TABLE blog_post_tags;

-- 確認用：現在のポリシーを表示
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('blog_posts', 'blog_categories', 'blog_tags', 'blog_post_tags')
ORDER BY tablename, policyname;