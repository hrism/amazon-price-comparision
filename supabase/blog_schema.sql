-- ブログ用テーブル作成（Supabase）

-- カテゴリーテーブル
CREATE TABLE blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- タグテーブル
CREATE TABLE blog_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ブログ記事テーブル
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    status VARCHAR(10) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
    
    -- SEO
    meta_title VARCHAR(60),
    meta_description VARCHAR(160),
    meta_keywords VARCHAR(255),
    
    -- 関連
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
    
    -- 日時
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- カウンター
    view_count INTEGER DEFAULT 0
);

-- 記事タグ中間テーブル
CREATE TABLE blog_post_tags (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- インデックス
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status_published ON blog_posts(status, published_at);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);

-- Row Level Security (RLS) 設定
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- 公開記事は誰でも読める
CREATE POLICY "Public can read published posts" ON blog_posts
    FOR SELECT USING (status = 'published' AND published_at <= NOW());

-- カテゴリー・タグは誰でも読める
CREATE POLICY "Public can read categories" ON blog_categories FOR SELECT USING (true);
CREATE POLICY "Public can read tags" ON blog_tags FOR SELECT USING (true);
CREATE POLICY "Public can read post tags" ON blog_post_tags FOR SELECT USING (true);

-- 認証済みユーザーは自分の記事を管理可能
CREATE POLICY "Users can manage own posts" ON blog_posts
    FOR ALL USING (auth.uid() = author_id);

-- 管理者権限（superuser role）
CREATE POLICY "Admins can manage all" ON blog_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = id 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 認証済みユーザーはカテゴリ・タグを管理可能
CREATE POLICY "Authenticated users can manage categories" ON blog_categories
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tags" ON blog_tags
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage post tags" ON blog_post_tags
    FOR ALL USING (auth.uid() IS NOT NULL);

-- トリガー：updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blog_posts_updated_at 
    BEFORE UPDATE ON blog_posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ
INSERT INTO blog_categories (name, slug, description) VALUES
('テクノロジー', 'technology', 'テクノロジーに関する最新情報'),
('ライフスタイル', 'lifestyle', '日常生活を豊かにするヒント'),
('ショッピング', 'shopping', 'お得な買い物情報');

INSERT INTO blog_tags (name, slug) VALUES
('AI', 'ai'),
('価格比較', 'price-comparison'),
('節約', 'saving'),
('Amazon', 'amazon'),
('レビュー', 'review');