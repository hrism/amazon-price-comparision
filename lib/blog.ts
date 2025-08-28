import { supabase } from './supabase';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'scheduled';
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  author_id: string;
  category_id?: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  
  // Relations
  author?: {
    id: string;
    email: string;
    user_metadata: any;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
    description: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

// 全記事取得（トップページ用）
export async function getAllPosts(): Promise<BlogPost[]> {
  const { posts } = await getBlogPosts({ per_page: 20 });
  
  // categoryが文字列かBlogCategoryかを判定して適切に処理
  return posts.map(post => ({
    ...post,
    category: typeof post.category === 'string' 
      ? post.category 
      : (post.category?.slug || 'toilet-paper')
  })) as any;
}

// ブログ記事一覧取得
export async function getBlogPosts(params?: {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  per_page?: number;
}) {
  const { category, tag, search, page = 1, per_page = 10 } = params || {};
  
  const now = new Date().toISOString();
  
  let query = supabase
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status,
      meta_title,
      meta_description,
      meta_keywords,
      author_id,
      category_id,
      published_at,
      created_at,
      updated_at,
      view_count,
      category:blog_categories(*)
    `, { count: 'exact' })
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${now})`)
    .order('published_at', { ascending: false });
  
  // published_atのフィルタリングは後で行う（タイムゾーン問題を回避）

  // フィルタリング
  if (category) {
    query = query.eq('category.slug', category);
  }
  
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`);
  }

  // ページネーション
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  
  console.log('Blog posts query result:', { 
    dataCount: data?.length, 
    error, 
    count,
    firstPost: data?.[0]?.slug 
  });
  
  if (error) {
    console.error('Error fetching blog posts:', error);
    return { posts: [], total: 0 };
  }
  
  if (!data || data.length === 0) {
    console.log('No blog posts found');
    return { posts: [], total: 0 };
  }

  // published_atでフィルタリング（JST対応）
  const nowDate = new Date();
  const filteredPosts = (data || []).filter(post => {
    if (!post.published_at) return false;
    const publishedDate = new Date(post.published_at);
    return publishedDate <= nowDate;
  });

  // 各記事のタグを取得
  const postsWithTags = await Promise.all(
    filteredPosts.map(async (post) => {
      const { data: tagRelations } = await supabase
        .from('blog_post_tags')
        .select('blog_tags(*)')
        .eq('post_id', post.id);
      
      const tags = tagRelations?.map(rel => rel.blog_tags).filter(Boolean).flat() || [];
      
      // categoryをBlogCategoryオブジェクトとして扱う
      const category = Array.isArray(post.category) ? post.category[0] : post.category;
      
      return { 
        ...post, 
        tags,
        category: category || undefined
      };
    })
  );

  return { 
    posts: postsWithTags as BlogPost[], 
    total: count || 0 
  };
}

// 個別記事取得
export async function getBlogPost(slug: string) {
  const now = new Date().toISOString();
  
  console.log('Fetching blog post with slug:', slug);
  
  // まず記事本体を取得（複数ある場合も考慮）
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      category:blog_categories(*)
    `)
    .eq('slug', slug);
  
  const post = posts?.[0];
  
  // 予約投稿のステータスを自動更新
  if (post && post.status === 'scheduled' && post.published_at && new Date(post.published_at) <= new Date()) {
    await supabase
      .from('blog_posts')
      .update({ status: 'published' })
      .eq('id', post.id);
    post.status = 'published';
  }

  console.log('Query result:', { post, error });

  if (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }

  if (!post) {
    return null;
  }

  // タグを別途取得
  const { data: tagRelations } = await supabase
    .from('blog_post_tags')
    .select('blog_tags(*)')
    .eq('post_id', post.id);

  // タグデータを整形
  const tags = tagRelations?.map(rel => rel.blog_tags).filter(Boolean).flat() || [];

  // ビューカウント増加
  await supabase
    .from('blog_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('id', post.id);

  return { ...post, tags } as BlogPost;
}

// カテゴリー一覧取得
export async function getBlogCategories() {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data as BlogCategory[];
}

// タグ一覧取得
export async function getBlogTags() {
  const { data, error } = await supabase
    .from('blog_tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  return data as BlogTag[];
}

// ブログ用サイトマップ生成
export async function getBlogSitemap() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching blog sitemap:', error);
    return [];
  }

  const baseUrl = 'https://www.yasu-ku-kau.com';

  return data.map(post => ({
    loc: `${baseUrl}/blog/${post.slug}`,
    lastmod: post.updated_at,
    changefreq: 'weekly',
    priority: 0.8
  }));
}

// 記事作成（認証必要）
export async function createBlogPost(post: Partial<BlogPost>) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...post,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  return data as BlogPost;
}

// 記事更新（認証必要）
export async function updateBlogPost(id: string, updates: Partial<BlogPost>) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }

  return data as BlogPost;
}