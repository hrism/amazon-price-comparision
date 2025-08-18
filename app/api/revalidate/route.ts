import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
  try {
    // 認証トークンをチェック
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const expectedToken = process.env.VERCEL_API_TOKEN;
    
    if (!expectedToken) {
      console.log('VERCEL_API_TOKEN not configured, allowing revalidation');
    } else if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // 再検証するパスとタグを取得
    const paths = searchParams.get('paths')?.split(',') || [];
    const tags = searchParams.get('tags')?.split(',') || [];
    
    // デフォルトで主要なパスを再検証
    if (paths.length === 0 && tags.length === 0) {
      paths.push('/toilet-paper', '/dishwashing-liquid', '/');
      tags.push('products', 'scrape-status');
    }
    
    // パスごとに再検証
    for (const path of paths) {
      revalidatePath(path);
      console.log(`Revalidated path: ${path}`);
    }
    
    // タグごとに再検証
    for (const tag of tags) {
      revalidateTag(tag);
      console.log(`Revalidated tag: ${tag}`);
    }
    
    return NextResponse.json({ 
      success: true, 
      revalidated: { paths, tags },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}