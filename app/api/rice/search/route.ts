import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Create Supabase client inside the function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ 
      error: 'Configuration error', 
      details: 'Missing Supabase credentials' 
    }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get('force') === 'true';
  const useFresh = searchParams.get('useFresh') === 'true';
  
  // 既存データを返す（force=falseの場合）
  if (!force) {
    try {
      const { data, error } = await supabase
        .from('rice_products')
        .select('*')
        .order(useFresh ? 'price_per_kg_fresh' : 'price_per_kg', { ascending: true });
      
      if (error) throw error;

      // 最新の更新時刻を取得
      const lastUpdated = data?.length > 0 
        ? data.reduce((latest, product) => {
            const productDate = new Date(product.last_fetched_at);
            return productDate > latest ? productDate : latest;
          }, new Date(0)).toISOString()
        : null;

      return NextResponse.json({
        products: data || [],
        lastUpdate: lastUpdated,
        count: data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching rice products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rice products', details: error },
        { status: 500 }
      );
    }
  }

  // force=trueの場合はPythonバックエンドに転送
  try {
    const backendUrl = process.env.NODE_ENV === 'production'
      ? 'https://your-python-backend.com'  // 本番環境のPythonバックエンドURL
      : 'http://localhost:8000';
    
    // トークンが必要な場合
    const scrapeToken = process.env.SCRAPE_AUTH_TOKEN;
    const url = new URL(`${backendUrl}/api/rice/search`);
    url.searchParams.set('force', 'true');
    url.searchParams.set('keyword', '米');
    if (scrapeToken) {
      url.searchParams.set('scrape_token', scrapeToken);
    }
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rice products from backend', details: error },
      { status: 500 }
    );
  }
}