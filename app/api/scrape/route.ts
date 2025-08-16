import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { validateAuth, rateLimit, getClientIP, validateInput } from '@/lib/auth-utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const rateLimitResult = rateLimit(`scrape:${clientIP}`, 5, 300000); // 5回/5分
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // ローカル環境でのみ実行可能
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Scraping is only available in development mode' },
        { status: 403 }
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
    
    return new Promise<NextResponse>((resolve) => {
      // Pythonスクリプトを実行（タイムアウトを避けるためspawnを使用）
      const pythonProcess = spawn('python', ['scrape_and_save.py'], {
        cwd: './python-backend'
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Python output:', data.toString());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python error:', data.toString());
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Scraping started successfully',
            output: output.substring(0, 1000) // 最初の1000文字のみ返す
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            message: 'Scraping process failed',
            error: errorOutput
          }, { status: 500 }));
        }
      });
      
      // プロセスを切り離して実行（レスポンスを待たない）
      pythonProcess.unref();
      
      // 即座にレスポンスを返す
      setTimeout(() => {
        resolve(NextResponse.json({
          success: true,
          message: 'スクレイピングプロセスをバックグラウンドで開始しました',
          info: '処理完了まで1-2分かかります。完了後、ページをリロードしてください。'
        }));
      }, 100);
    });
    
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