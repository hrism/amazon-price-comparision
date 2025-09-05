import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Product型定義をここに移動（lib/supabaseからのインポートを避ける）
interface Product {
  id?: string;
  asin: string;
  title: string;
  description?: string;
  brand?: string;
  image_url?: string;
  price?: number;
  price_regular?: number;
  discount_percent?: number;
  on_sale: boolean;
  review_avg?: number;
  review_count?: number;
  roll_count?: number;
  length_m?: number;
  total_length_m?: number;
  price_per_roll?: number;
  price_per_m?: number;
  is_double?: boolean;
  last_fetched_at?: string;
  created_at?: string;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('API /search called');
  
  try {
    // Create Supabase client with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length
    });
    
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

    console.log('Request params:', { keyword, filter, force });

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // まずキャッシュを確認
    // トイレットペーパー用のテーブルを使用
    let query = supabase
      .from('toilet_paper_products')  // productsではなくtoilet_paper_products
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
    
    // 最終更新日時を取得
    let lastUpdated = null;
    if (cachedProducts && cachedProducts.length > 0) {
      const latestProduct = cachedProducts.reduce((latest, product) => {
        if (!latest.last_fetched_at) return product;
        if (!product.last_fetched_at) return latest;
        return new Date(product.last_fetched_at) > new Date(latest.last_fetched_at) ? product : latest;
      });
      lastUpdated = latestProduct.last_fetched_at;
    }

    // Vercel Functionsでは既存のSupabaseデータを返す
    // 実際のスクレイピングはGitHub Actionsで定期実行
    console.log('Returning products from Supabase:', cachedProducts?.length || 0);
    return NextResponse.json({
      products: cachedProducts || [],
      lastUpdate: lastUpdated,
      count: cachedProducts?.length || 0
    });

  } catch (error) {
    console.error('Search API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}