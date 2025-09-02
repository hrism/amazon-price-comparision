import { NextRequest, NextResponse } from 'next/server';

// Lambda関数を呼び出すAPIエンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_types, force_scrape, scrape_token } = body;

    // Lambda関数のURL（環境変数から取得）
    const lambdaUrl = process.env.LAMBDA_FUNCTION_URL;
    
    if (!lambdaUrl) {
      // Lambda URLが設定されていない場合は、従来のPythonバックエンドを使用
      const pythonBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // 商品タイプに応じてエンドポイントを選択
      const endpoint = product_types.includes('dishwashing_liquid') 
        ? '/api/dishwashing-liquid/search' 
        : '/api/search';
      
      const response = await fetch(`${pythonBackendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: product_types.includes('dishwashing_liquid') ? '食器用洗剤' : 'トイレットペーパー',
          force: true,
          scrape_token: scrape_token || process.env.SCRAPE_AUTH_TOKEN
        }),
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.statusText}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Lambda関数を呼び出し
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_types,
        force_scrape: force_scrape || false,
        scrape_token: scrape_token || process.env.SCRAPE_AUTH_TOKEN
      }),
    });

    if (!response.ok) {
      throw new Error(`Lambda function error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true, 
      message: 'Scraping completed',
      results: data 
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to execute scraping' },
      { status: 500 }
    );
  }
}