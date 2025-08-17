import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // トイレットペーパーの最終更新時刻を取得
    const { data: toiletPaper, error: toiletError } = await supabase
      .from('toilet_paper_products')
      .select('last_fetched_at, updated_at')
      .order('last_fetched_at', { ascending: false })
      .limit(1)
      .single();

    // 食器用洗剤の最終更新時刻を取得
    const { data: dishwashing, error: dishError } = await supabase
      .from('dishwashing_liquid_products')
      .select('last_fetched_at, updated_at')
      .order('last_fetched_at', { ascending: false })
      .limit(1)
      .single();

    // 各テーブルの商品数を取得
    const { count: toiletCount } = await supabase
      .from('toilet_paper_products')
      .select('*', { count: 'exact', head: true });

    const { count: dishCount } = await supabase
      .from('dishwashing_liquid_products')
      .select('*', { count: 'exact', head: true });

    const now = new Date();
    const toiletLastUpdate = toiletPaper?.last_fetched_at || toiletPaper?.updated_at;
    const dishLastUpdate = dishwashing?.last_fetched_at || dishwashing?.updated_at;

    // 最終更新からの経過時間を計算
    const getTimeSinceUpdate = (lastUpdate: string | null) => {
      if (!lastUpdate) return '未更新';
      const diff = now.getTime() - new Date(lastUpdate).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}日前`;
      } else if (hours > 0) {
        return `${hours}時間${minutes}分前`;
      } else {
        return `${minutes}分前`;
      }
    };

    // 次回実行予定時刻を計算（4時間ごと）
    const getNextScheduledRun = () => {
      const lastRun = toiletLastUpdate || dishLastUpdate;
      if (!lastRun) return '未定';
      
      const lastRunTime = new Date(lastRun);
      const nextRun = new Date(lastRunTime);
      
      // 最後の実行時刻から4時間ごとの次回実行時刻を計算
      while (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 4);
      }
      
      return nextRun.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const status = {
      success: true,
      lastUpdate: {
        toiletPaper: {
          timestamp: toiletLastUpdate,
          timeSince: getTimeSinceUpdate(toiletLastUpdate),
          productCount: toiletCount || 0,
          isRecent: toiletLastUpdate ? 
            (now.getTime() - new Date(toiletLastUpdate).getTime()) < (4 * 60 * 60 * 1000) : false
        },
        dishwashing: {
          timestamp: dishLastUpdate,
          timeSince: getTimeSinceUpdate(dishLastUpdate),
          productCount: dishCount || 0,
          isRecent: dishLastUpdate ? 
            (now.getTime() - new Date(dishLastUpdate).getTime()) < (4 * 60 * 60 * 1000) : false
        }
      },
      nextScheduledRun: getNextScheduledRun(),
      schedule: '4時間ごとに自動実行',
      currentTime: now.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };

    return NextResponse.json(status);
    
  } catch (error) {
    console.error('Error checking scrape status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check scraping status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}