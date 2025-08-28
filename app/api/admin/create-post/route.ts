import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 管理者用のSupabaseクライアント（RLSを回避）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const postData = await request.json();
    
    console.log('Creating post with admin client:', postData.slug);
    
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
    if (postData.tag_ids && postData.tag_ids.length > 0 && post) {
      const tagRelations = postData.tag_ids.map((tagId: number) => ({
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
    
    console.log('Post created successfully:', post.id);
    
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