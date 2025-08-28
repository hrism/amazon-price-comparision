import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'toilet-paper-panic-history';
  const id = searchParams.get('id');
  
  const now = new Date().toISOString();
  
  // 1. 記事を条件なしで取得（複数ある場合に対応）
  let rawPostsQuery = supabase.from('blog_posts').select('*');
  
  if (id) {
    rawPostsQuery = rawPostsQuery.eq('id', id);
  } else {
    rawPostsQuery = rawPostsQuery.eq('slug', slug);
  }
  
  const { data: rawPosts, error: rawError } = await rawPostsQuery;
  
  // すべての記事を確認（ステータス関係なく全て）
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, status, published_at')
    .order('created_at', { ascending: false });
  
  // panic関連の記事を検索
  const { data: panicPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, status, published_at')
    .ilike('slug', '%panic%');
    
  // 2. 公開条件付きで取得（現在のコードと同じ）
  const { data: filteredPosts, error: filteredError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${now})`);
  
  const rawPost = rawPosts?.[0];
  const filteredPost = filteredPosts?.[0];
  
  return NextResponse.json({
    currentTime: now,
    currentTimeJST: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    allPostsInDB: allPosts?.map(p => ({
      slug: p.slug,
      title: p.title,
      status: p.status,
      published_at: p.published_at
    })),
    panicPosts: panicPosts?.map(p => ({
      slug: p.slug,
      title: p.title,
      status: p.status,
      published_at: p.published_at  
    })),
    rawPosts: {
      count: rawPosts?.length || 0,
      data: rawPosts,
      error: rawError?.message
    },
    filteredPosts: {
      count: filteredPosts?.length || 0,
      data: filteredPosts,
      error: filteredError?.message
    },
    analysis: {
      postExists: !!rawPost,
      passesFilter: !!filteredPost,
      status: rawPost?.status,
      publishedAt: rawPost?.published_at,
      isPublished: rawPost?.status === 'published',
      isScheduled: rawPost?.status === 'scheduled',
      publishedAtComparison: rawPost?.published_at ? {
        publishedAt: rawPost.published_at,
        currentTime: now,
        isPast: new Date(rawPost.published_at) <= new Date()
      } : null,
      duplicateSlug: (rawPosts?.length || 0) > 1
    }
  });
}