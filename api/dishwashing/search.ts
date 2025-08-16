import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '食器用洗剤';
    const filter = searchParams.get('filter');
    const force = searchParams.get('force') === 'true';

    // 強制更新でない限り、DBキャッシュを使用
    if (!force) {
      // データベースから商品を取得
      let query = supabase
        .from('dishwashing_liquid_products')
        .select('*');

      // フィルタリング
      if (filter === 'refill') {
        query = query.eq('is_refill', true);
      } else if (filter === 'regular') {
        query = query.eq('is_refill', false);
      } else if (filter === 'sale') {
        query = query.eq('on_sale', true);
      }

      // 単価でソート
      query = query.order('price_per_1000ml', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        return NextResponse.json(data);
      }
    }

    // force=true の場合、GitHub Actionsでの更新を促す
    if (force) {
      return NextResponse.json({
        message: 'データ更新はGitHub Actionsで定期実行されます。手動更新が必要な場合は管理画面から実行してください。',
        data: []
      }, { status: 202 });
    }

    // データがない場合
    const { data: allProducts } = await supabase
      .from('dishwashing_liquid_products')
      .select('*')
      .order('price_per_1000ml', { ascending: true });

    return NextResponse.json(allProducts || []);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}