import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const { tag_ids, ...postData } = await request.json();
    
    console.log('Creating post with admin client:', postData.slug);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.SUPABASE_SERVICE_KEY);
    console.log('Post data received:', JSON.stringify(postData));
    console.log('Tag IDs:', tag_ids);
    
    // 実行時に管理者クライアントを取得
    const supabaseAdmin = getSupabaseAdmin();
    
    // 管理者権限で記事を作成（RLSを回避）
    const { data: post, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .insert(postData)
      .select()
      .single();
    
    if (postError) {
      console.error('Failed to create post:', postError);
      return NextResponse.json(
        { 
          success: false, 
          error: postError.message,
          code: postError.code,
          details: postError.details 
        },
        { status: 400 }
      );
    }
    
    // タグの関連付け
    if (tag_ids && tag_ids.length > 0 && post) {
      const tagRelations = tag_ids.map((tagId: number) => ({
        post_id: post.id,
        tag_id: tagId
      }));
      
      const { error: tagError } = await supabaseAdmin
        .from('blog_post_tags')
        .insert(tagRelations);
      
      if (tagError) {
        console.warn('Failed to create tag relations:', tagError);
      }
    }
    
    console.log('Post created successfully:', post?.id);
    
    return NextResponse.json({ 
      success: true, 
      post,
      message: '記事が正常に作成されました'
    });
    
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}