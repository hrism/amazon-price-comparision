import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth, rateLimit, getClientIP, validateInput } from '@/lib/auth-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { asin: string } }
) {
  try {
    // 認証チェック
    const authResult = await validateAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`refetch:${clientIP}`, 10, 60000); // 10回/分
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { asin } = params;

    // ASIN検証
    const validationResult = validateInput({ asin }, {
      asin: ['required', 'alphanumeric', 'maxLength:20']
    });
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      );
    }

    // Amazon商品ページから情報を取得
    const url = `https://www.amazon.co.jp/dp/${asin}`;
    
    // 注：実際のスクレイピングは外部サービスまたはPuppeteerなどを使用する必要があります
    // ここでは簡略化のため、データベースの更新日時だけを更新します
    
    // まずトイレットペーパーのテーブルをチェック
    let { data, error } = await supabase
      .from('toilet_paper_products')
      .update({ 
        updated_at: new Date().toISOString(),
        // 実際にはここで価格等の情報も更新する
      })
      .eq('asin', asin)
      .select()
      .single();

    // トイレットペーパーで見つからなかった場合、洗剤のテーブルをチェック
    if (error && error.code === 'PGRST116') {
      const dishResult = await supabase
        .from('dishwashing_liquid_products')
        .update({ 
          updated_at: new Date().toISOString(),
          // 実際にはここで価格等の情報も更新する
        })
        .eq('asin', asin)
        .select()
        .single();
      
      data = dishResult.data;
      error = dishResult.error;
    }

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update product', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Product ${asin} updated`,
      data 
    });
    
  } catch (error) {
    console.error('Refetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}