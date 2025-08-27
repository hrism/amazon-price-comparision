'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<BlogCategory[]>([]);

  useEffect(() => {
    fetchBlogCategories();
    fetchBlogPosts();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.category?.slug === selectedCategory));
    }
  }, [selectedCategory, posts]);

  const fetchBlogCategories = async () => {
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchBlogPosts = async () => {
    try {
      // 現在時刻を取得
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image,
          published_at,
          status,
          category:blog_categories(*)
        `)
        .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${now})`)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching blog posts:', error);
      } else {
        // フィルタリング（現在時刻より前の記事のみ）
        const now = new Date();
        const publishedPosts = (data || []).filter(post => {
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
        setFilteredPosts(postsWithTags);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">ブログ</h1>

      {/* カテゴリフィルター */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="カテゴリー">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`${
              selectedCategory === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
          >
            すべて
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.slug)}
              className={`${
                selectedCategory === category.slug
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              {category.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 記事一覧 */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
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
                    {post.category && (
                      <span className="text-sm text-blue-600">
                        {post.category.name}
                      </span>
                    )}
                    <h2 className="mt-2 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-gray-600 line-clamp-3">{post.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <span>
                        安く買う.com 編集部
                      </span>
                      <time dateTime={post.published_at || ''}>
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
          
          {filteredPosts.length === 0 && (
            <p className="text-center text-gray-500 py-12">
              {selectedCategory === 'all' 
                ? 'まだ記事が投稿されていません。'
                : 'このカテゴリーには記事がありません。'}
            </p>
          )}
        </>
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