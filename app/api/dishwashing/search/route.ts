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
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter'); // refill, regular, sale

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // Supabaseから洗剤データを取得
    let query = supabase
      .from('dishwashing_liquid_products')
      .select('*')
      .order('price_per_1000ml', { ascending: true });

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

    // Vercel Functionsでは既存のSupabaseデータを返す
    // 実際のスクレイピングはGitHub Actionsで定期実行
    if (products && products.length > 0) {
      console.log('Returning dishwashing products from Supabase:', products.length);
      return NextResponse.json(products);
    } else {
      console.log('No dishwashing products found in database');
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error('Dishwashing Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}