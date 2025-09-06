import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Python backend APIを呼び出し
    const backendUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8000'
      : process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/mask/filters`);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error fetching mask filters:', error);
    
    // フォールバック: 静的なフィルターオプションを返す
    return NextResponse.json({
      colors: [
        { value: 'white', count: 0, label: 'ホワイト' },
        { value: 'multicolor', count: 0, label: 'マルチカラー' },
        { value: 'black', count: 0, label: 'ブラック' },
        { value: 'gray', count: 0, label: 'グレー' },
        { value: 'pink', count: 0, label: 'ピンク' },
        { value: 'beige', count: 0, label: 'ベージュ' },
        { value: 'blue', count: 0, label: 'ブルー' },
        { value: 'purple', count: 0, label: 'パープル' }
      ],
      sizes: [
        { value: 'regular', count: 0, label: 'ふつう' },
        { value: 'large', count: 0, label: '大きめ' },
        { value: 'small', count: 0, label: '小さめ' },
        { value: 'slightly_large', count: 0, label: 'やや大きめ' },
        { value: 'slightly_small', count: 0, label: 'やや小さめ' },
        { value: 'kids', count: 0, label: '子供用' }
      ]
    });
  }
}