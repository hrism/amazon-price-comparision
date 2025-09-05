import { NextRequest, NextResponse } from 'next/server';
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
        details: 'Missing Supabase credentials' 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || '食器用洗剤';
    const filter = searchParams.get('filter'); // refill, regular, sale

    // Supabaseから洗剤データを取得
    let query = supabase
      .from('dishwashing_liquid_products')
      .select('*');
      
    query = query.order('price_per_1000ml', { ascending: true });

    // フィルタ適用
    if (filter === 'refill') {
      query = query.eq('is_refill', true);
    } else if (filter === 'regular') {
      query = query.eq('is_refill', false);
    } else if (filter === 'sale') {
      query = query.eq('on_sale', true);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 最終更新日時を取得
    let lastUpdated = null;
    if (products && products.length > 0) {
      const latestProduct = products.reduce((latest, product) => {
        if (!latest.last_fetched_at) return product;
        if (!product.last_fetched_at) return latest;
        return new Date(product.last_fetched_at) > new Date(latest.last_fetched_at) ? product : latest;
      });
      lastUpdated = latestProduct.last_fetched_at;
    }

    // Vercel Functionsでは既存のSupabaseデータを返す
    // 実際のスクレイピングはGitHub Actionsで定期実行
    console.log('Returning dishwashing products from Supabase:', products?.length || 0);
    return NextResponse.json({
      products: products || [],
      lastUpdate: lastUpdated,
      count: products?.length || 0
    });

  } catch (error) {
    console.error('Dishwashing Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}