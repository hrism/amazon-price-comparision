import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const COLOR_LABELS: { [key: string]: string } = {
  'white': 'ホワイト',
  'multicolor': 'マルチカラー',
  'black': 'ブラック',
  'gray': 'グレー',
  'pink': 'ピンク',
  'beige': 'ベージュ',
  'blue': 'ブルー',
  'purple': 'パープル',
  'green': 'グリーン',
  'yellow': 'イエロー'
};

const SIZE_LABELS: { [key: string]: string } = {
  'regular': 'ふつう',
  'large': '大きめ',
  'small': '小さめ',
  'slightly_large': 'やや大きめ',
  'slightly_small': 'やや小さめ',
  'kids': '子供用'
};

export async function GET() {
  try {
    // 開発環境ではPython backendから取得
    if (process.env.NODE_ENV === 'development') {
      try {
        const backendUrl = 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/mask/filters`, {
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        console.warn('Python backend not available, falling back to Supabase');
      }
    }

    // 本番環境またはPython backendが利用できない場合はSupabaseから直接取得
    const { data: products, error } = await supabase
      .from('mask_products')
      .select('mask_color, mask_size, price_per_mask')
      .not('price_per_mask', 'is', null)
      .gt('price_per_mask', 0);

    if (error) {
      throw error;
    }

    // カラーとサイズの集計
    const colorCounts: { [key: string]: number } = {};
    const sizeCounts: { [key: string]: number } = {};

    products?.forEach((product: any) => {
      if (product.mask_color) {
        colorCounts[product.mask_color] = (colorCounts[product.mask_color] || 0) + 1;
      }
      if (product.mask_size) {
        sizeCounts[product.mask_size] = (sizeCounts[product.mask_size] || 0) + 1;
      }
    });

    // 配列に変換してソート（カウントの降順）
    const colors = Object.entries(colorCounts)
      .filter(([key]) => key !== 'null')
      .map(([value, count]) => ({
        value,
        count,
        label: COLOR_LABELS[value] || value
      }))
      .sort((a, b) => b.count - a.count);

    const sizes = Object.entries(sizeCounts)
      .map(([value, count]) => ({
        value,
        count,
        label: SIZE_LABELS[value] || value
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ colors, sizes });

  } catch (error: any) {
    console.error('Error fetching mask filters:', error);

    // エラー時は空のフィルターを返す（0件表示を避けるため非表示）
    return NextResponse.json({
      colors: [],
      sizes: []
    });
  }
}