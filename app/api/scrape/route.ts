import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, rateLimit, getClientIP, validateInput } from '@/lib/auth-utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 本番環境でのみ認証チェック
    if (process.env.NODE_ENV === 'production') {
      const authResult = await validateAuth(request);
      if (!authResult.valid) {
        return NextResponse.json(
          { error: 'Unauthorized', details: authResult.error },
          { status: 401 }
        );
      }
      
      // 本番環境では実行不可
      return NextResponse.json(
        { error: 'Scraping is only available in development mode' },
        { status: 403 }
      );
    }

    // Rate limiting（ローカル環境でも有効）
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`scrape:${clientIP}`, 5, 300000); // 5回/5分
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const requestBody = await request.json();
    
    // 入力値検証
    const validationResult = validateInput(requestBody, {
      type: ['maxLength:50']
    });
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      );
    }
    
    const { type } = requestBody;
    
    // PythonバックエンドのAPIを呼び出す
    try {
      const apiUrl = type === 'dishwashing_liquid' 
        ? 'http://localhost:8000/api/dishwashing/search'
        : 'http://localhost:8000/api/search';
      
      const searchParams = new URLSearchParams({
        keyword: type === 'dishwashing_liquid' ? '食器用洗剤' : 'トイレットペーパー',
        force: 'true'
      });
      
      const response = await fetch(`${apiUrl}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Scraping API error:', errorText);
        return NextResponse.json({
          success: false,
          message: 'Scraping failed',
          error: errorText
        }, { status: response.status });
      }
      
      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        message: 'スクレイピングが完了しました',
        productCount: data.length,
        info: `${data.length}件の商品データを更新しました`
      });
      
    } catch (error) {
      console.error('Error calling Python backend:', error);
      return NextResponse.json({
        success: false,
        message: 'Scraping failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        error: 'Scraping failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}