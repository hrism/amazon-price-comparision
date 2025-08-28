-- blog_postsテーブルのRLSポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON blog_posts;

-- 新しいポリシーを作成

-- 1. 誰でも公開記事を閲覧可能
CREATE POLICY "Anyone can view published posts" ON blog_posts
    FOR SELECT
    USING (
        status = 'published' 
        OR (status = 'scheduled' AND published_at <= NOW())
    );

-- 2. 認証済みユーザーは全記事を閲覧可能
CREATE POLICY "Authenticated users can view all posts" ON blog_posts
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. 認証済みユーザーは記事を作成可能
CREATE POLICY "Authenticated users can insert posts" ON blog_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. 認証済みユーザーは記事を更新可能
CREATE POLICY "Authenticated users can update posts" ON blog_posts
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. 認証済みユーザーは記事を削除可能
CREATE POLICY "Authenticated users can delete posts" ON blog_posts
    FOR DELETE
    TO authenticated
    USING (true);

-- blog_post_tagsテーブルのRLSポリシー
DROP POLICY IF EXISTS "Anyone can view tags" ON blog_post_tags;
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON blog_post_tags;

CREATE POLICY "Anyone can view tags" ON blog_post_tags
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage tags" ON blog_post_tags
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);