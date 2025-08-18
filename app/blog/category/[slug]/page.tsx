'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CategoryGrid from '@/components/CategoryGrid';
import { categories as productCategories } from '@/lib/categories';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  published_at?: string;
  category?: BlogCategory;
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.slug as string;
  
  const [category, setCategory] = useState<BlogCategory | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchCategoryAndPosts();
  }, [categorySlug]);

  const fetchCategoryAndPosts = async () => {
    try {
      // カテゴリー情報を取得
      console.log('Fetching category:', categorySlug);
      const { data: categoryData, error: categoryError } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single();

      console.log('Category result:', { categoryData, categoryError });

      if (categoryError || !categoryData) {
        console.error('Category not found:', categorySlug, categoryError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCategory(categoryData);

      // カテゴリーに属する記事を取得
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image,
          published_at,
          category:blog_categories(*)
        `)
        .eq('category_id', categoryData.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!postsError && postsData) {
        // 現在時刻より前の記事のみフィルタリング
        const now = new Date();
        const publishedPosts = postsData.filter(post => {
          if (!post.published_at) return false;
          return new Date(post.published_at) <= now;
        });

        // タグを取得
        const postsWithTags = await Promise.all(
          publishedPosts.map(async (post) => {
            const { data: tagRelations } = await supabase
              .from('blog_post_tags')
              .select('blog_tags(*)')
              .eq('post_id', post.id);
            
            const tags = tagRelations?.map(rel => rel.blog_tags).filter(Boolean).flat() || [];
            const category = Array.isArray(post.category) ? post.category[0] : post.category;
            
            return { 
              ...post, 
              tags,
              category: category || undefined
            };
          })
        );

        setPosts(postsWithTags);
      }
    } catch (error) {
      console.error('Error in fetchCategoryAndPosts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">カテゴリーが見つかりません</h1>
        <Link href="/blog" className="text-blue-600 hover:text-blue-800">
          ← ブログ一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ナビゲーション */}
      <nav className="mb-8">
        <Link href="/blog" className="text-blue-600 hover:text-blue-800">
          ← ブログ一覧に戻る
        </Link>
      </nav>
      
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {category?.name}
        </h1>
        {category?.description && (
          <p className="text-lg text-gray-600 mb-4">{category.description}</p>
        )}
        <p className="text-sm text-gray-500">
          {posts.length}件の記事
        </p>
      </header>
      
      {/* 記事一覧 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="block">
            <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full">
              <div className="aspect-[16/9] relative bg-gray-100">
                {post.featured_image ? (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {post.title}
                </h2>
                <p className="text-gray-600 line-clamp-3 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    安く買う.com 編集部
                  </span>
                  <time dateTime={post.published_at}>
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('ja-JP') : ''}
                  </time>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
      
      {posts.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          このカテゴリーにはまだ記事がありません。
        </p>
      )}
      
      {/* 商材別ページへのリンク */}
      <div className="mt-12">
        <CategoryGrid 
          categories={productCategories}
          title="商品価格比較ページ"
          subtitle="各商品カテゴリーの価格比較ページをご覧いただけます"
        />
      </div>
    </div>
  );
}