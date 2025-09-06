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
    const filter = searchParams.get('filter') || '';

    // Pythonバックエンドからデータを取得
    const pythonBackendUrl = process.env.NODE_ENV === 'production'
      ? 'https://your-python-backend.herokuapp.com'  // 本番環境のURL
      : 'http://localhost:8000';  // ローカル環境
    
    try {
      const params = new URLSearchParams({
        keyword: keyword,
        force: force ? 'true' : 'false'
      });
      if (filter) {
        params.append('filter', filter);
      }
      
      console.log(`Calling Python backend with params: ${params.toString()}`);
      const fullUrl = `${pythonBackendUrl}/api/mask/search?${params}`;
      console.log(`Full Python backend URL: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(`Python backend raw response (first 200 chars):`, responseText.substring(0, 200));
      
      try {
        const data = JSON.parse(responseText);
        console.log(`Python backend returned: ${data.count || 'unknown count'} products`);
        console.log(`Python backend data type: ${typeof data}, is array: ${Array.isArray(data)}`);
        console.log(`Python backend data structure:`, JSON.stringify(data, null, 2).substring(0, 200));
        
        // オブジェクト形式であることを確認
        if (data && typeof data === 'object' && !Array.isArray(data) && data.status === 'success') {
          console.log('✓ Valid Python backend response, returning object');
          return NextResponse.json(data);
        } else {
          console.log('⚠️ Invalid Python backend response format, falling back to Supabase');
          throw new Error('Invalid response format from Python backend');
        }
      } catch (parseError) {
        console.error('Failed to parse Python backend response:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error('Python backend error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Falling back to Supabase');
      // Pythonバックエンドが利用できない場合は、Supabaseから既存のデータを返す
    }

    // データベースから既存データを取得
    let query = supabase
      .from('mask_products')
      .select('*');
    
    // フィルタリング
    if (filter) {
      if (filter === 'large_pack') {
        query = query.gte('mask_count', 50);
      } else if (filter === 'small_pack') {
        query = query.lt('mask_count', 50);
      } else if (filter === 'sale') {
        query = query.eq('on_sale', true);
      } else if (filter.startsWith('size_')) {
        const size = filter.replace('size_', '');
        query = query.eq('mask_size', size);
      } else if (filter.startsWith('color_')) {
        const color = filter.replace('color_', '');
        query = query.eq('mask_color', color);
      }
    }
    
    query = query.order('price_per_mask', { ascending: true, nullsFirst: false });

    const { data, error } = await query;

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