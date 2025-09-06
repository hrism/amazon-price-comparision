import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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
    const keyword = searchParams.get('keyword') || 'マスク';
    const force = searchParams.get('force') === 'true';

    // Pythonバックエンドから取得（mask_sizeデータを含む）
    const pythonBackendUrl = process.env.NODE_ENV === 'production'
      ? 'https://your-python-backend.herokuapp.com'  // 本番環境のURL
      : 'http://localhost:8000';  // ローカル環境
    
    try {
      const response = await fetch(`${pythonBackendUrl}/api/mask/search?keyword=${encodeURIComponent(keyword)}&force=${force}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.statusText}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Python backend error:', error);
      // Pythonバックエンドが利用できない場合は、既存のデータを返す
    }

    // データベースから既存データを取得
    const { data, error } = await supabase
      .from('mask_products')
      .select('*')
      .order('price_per_mask', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'データの取得に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    // 最終更新日時を取得
    let lastUpdated = null;
    if (data && data.length > 0) {
      const latestProduct = data.reduce((latest, product) => {
        if (!latest.last_fetched_at) return product;
        if (!product.last_fetched_at) return latest;
        return new Date(product.last_fetched_at) > new Date(latest.last_fetched_at) ? product : latest;
      });
      lastUpdated = latestProduct.last_fetched_at;
    }

    return NextResponse.json({
      products: data || [],
      lastUpdate: lastUpdated,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}