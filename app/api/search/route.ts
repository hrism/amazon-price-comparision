import { NextRequest, NextResponse } from 'next/server';
// Vercel Functions用: Supabaseから直接データを取得
import { Product } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ 
        error: 'Configuration error', 
        details: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter'); // single, double, sale
    const force = searchParams.get('force') === 'true'; // 強制的に新規取得

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // まずキャッシュを確認
    // キーワードが"トイレットペーパー"の場合は全商品を取得
    let query = supabase
      .from('products')
      .select('*');
      
    if (keyword !== 'トイレットペーパー') {
      query = query.ilike('title', `%${keyword}%`);
    }
    
    query = query.order('price_per_m', { ascending: true });

    // フィルタ適用
    if (filter === 'single') {
      query = query.eq('is_double', false);
    } else if (filter === 'double') {
      query = query.eq('is_double', true);
    } else if (filter === 'sale') {
      query = query.eq('on_sale', true);
    }

    const { data: cachedProducts, error: cacheError } = await query;
    
    if (cacheError) {
      console.error('Supabase query error:', cacheError);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: cacheError.message 
      }, { status: 500 });
    }

    console.log('Cache check - Found products:', cachedProducts?.length || 0);
    console.log('Force parameter:', force);
    
    // Vercel Functionsでは既存のSupabaseデータを返す
    // 実際のスクレイピングはGitHub Actionsで定期実行
    if (cachedProducts && cachedProducts.length > 0) {
      console.log('Returning products from Supabase:', cachedProducts.length);
      return NextResponse.json(cachedProducts);
    } else {
      console.log('No products found in database');
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}