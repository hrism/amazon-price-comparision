'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  published_at: string;
}

interface CategoryBlogSectionProps {
  categorySlug: 'toilet-paper' | 'dishwashing-liquid';
  categoryName: string;
}

export default function CategoryBlogSection({ categorySlug, categoryName }: CategoryBlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogPosts();
  }, [categorySlug]);

  const fetchBlogPosts = async () => {
    try {
      // カテゴリIDをスラッグから直接マッピング
      const categoryId = categorySlug === 'toilet-paper' ? 1 : 2;

      // 該当カテゴリのブログ記事を取得
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, published_at')
        .eq('category_id', categoryId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching blog posts:', error);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-[#F7F8FA] border border-[#D5D9D9] rounded-2xl p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#F7F8FA] border border-[#D5D9D9] rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-normal text-[#0F1111]">
          📝 {categoryName}に関する記事
        </h2>
        <a 
          href={`/blog/category/${categorySlug}`}
          className="text-[13px] text-[#007185] hover:text-[#C7511F] hover:underline"
        >
          すべて見る →
        </a>
      </div>
      
      <div className="space-y-4">
        {posts.map((post) => (
          <article key={post.id} className="flex gap-4 p-3 bg-white rounded-lg border border-[#E3E6E6] hover:shadow-sm transition-shadow">
            {post.featured_image && (
              <div className="w-20 h-20 flex-shrink-0">
                <img 
                  src={post.featured_image} 
                  alt={post.title}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-normal text-[#0F1111] mb-1 hover:text-[#C7511F] transition-colors">
                <a href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </a>
              </h3>
              
              {post.excerpt && (
                <p className="text-[12px] text-[#565959] mb-2 line-clamp-2">
                  {post.excerpt}
                </p>
              )}
              
              <div className="text-[11px] text-[#6F7373]">
                <time>{formatDate(post.published_at)}</time>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}