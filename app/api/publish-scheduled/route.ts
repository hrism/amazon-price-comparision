import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 管理者用のSupabaseクライアントを関数内で作成（実行時に環境変数を読み込む）
function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.error('Runtime: No service key found in environment variables!');
    console.error('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
    console.error('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// 予約投稿を公開する処理
export async function GET() {
  try {
    const now = new Date().toISOString();
    
    // 実行時に管理者クライアントを取得
    const supabaseAdmin = getSupabaseAdmin();
    
    // 公開時刻を過ぎた予約投稿を取得
    const { data: scheduledPosts, error: fetchError } = await supabaseAdmin
      .from('blog_posts')
      .select('id, slug, title, published_at')
      .eq('status', 'scheduled')
      .lte('published_at', now);
    
    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({ message: 'No scheduled posts to publish', count: 0 });
    }
    
    // ステータスをpublishedに更新
    const postIds = scheduledPosts.map(post => post.id);
    const { error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update({ status: 'published' })
      .in('id', postIds);
    
    if (updateError) {
      console.error('Error publishing posts:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    console.log(`Published ${scheduledPosts.length} scheduled posts:`, 
      scheduledPosts.map(p => ({ slug: p.slug, published_at: p.published_at }))
    );
    
    return NextResponse.json({
      message: `Successfully published ${scheduledPosts.length} posts`,
      publishedPosts: scheduledPosts.map(post => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        published_at: post.published_at
      }))
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GitHub ActionsやVercel Cronから定期実行される想定
export async function POST() {
  return GET();
}