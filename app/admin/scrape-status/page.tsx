'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface ScrapeStatus {
  success: boolean;
  lastUpdate: {
    toiletPaper: {
      timestamp: string | null;
      timeSince: string;
      productCount: number;
      isRecent: boolean;
    };
    dishwashing: {
      timestamp: string | null;
      timeSince: string;
      productCount: number;
      isRecent: boolean;
    };
  };
  nextScheduledRun: string;
  schedule: string;
  currentTime: string;
}

export default function ScrapeStatusPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStatus();
      
      // 30秒ごとに自動更新
      if (autoRefresh) {
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [user, autoRefresh]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scrape-status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">認証確認中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">認証が必要です</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">ステータス読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800"
          >
            ← 管理画面に戻る
          </Link>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-md ${
              autoRefresh 
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            自動更新: {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">スクレイピング実行状況</h1>
        <p className="text-gray-600 mt-2">現在時刻: {status?.currentTime}</p>
      </div>

      {status && (
        <>
          {/* スケジュール情報 */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">実行スケジュール</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">実行頻度</p>
                <p className="text-lg font-medium">{status.schedule}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">次回実行予定</p>
                <p className="text-lg font-medium">{status.nextScheduledRun}</p>
              </div>
            </div>
          </div>

          {/* カテゴリ別ステータス */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* トイレットペーパー */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                トイレットペーパー
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">最終更新</span>
                  <div className="text-right">
                    <span className={`font-medium ${
                      status.lastUpdate.toiletPaper.isRecent 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`}>
                      {status.lastUpdate.toiletPaper.timeSince}
                    </span>
                    {status.lastUpdate.toiletPaper.isRecent && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        最新
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">商品数</span>
                  <span className="font-medium">
                    {status.lastUpdate.toiletPaper.productCount} 件
                  </span>
                </div>
                {status.lastUpdate.toiletPaper.timestamp && (
                  <div className="text-xs text-gray-500 mt-2">
                    更新日時: {new Date(status.lastUpdate.toiletPaper.timestamp).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
            </div>

            {/* 食器用洗剤 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                食器用洗剤
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">最終更新</span>
                  <div className="text-right">
                    <span className={`font-medium ${
                      status.lastUpdate.dishwashing.isRecent 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`}>
                      {status.lastUpdate.dishwashing.timeSince}
                    </span>
                    {status.lastUpdate.dishwashing.isRecent && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        最新
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">商品数</span>
                  <span className="font-medium">
                    {status.lastUpdate.dishwashing.productCount} 件
                  </span>
                </div>
                {status.lastUpdate.dishwashing.timestamp && (
                  <div className="text-xs text-gray-500 mt-2">
                    更新日時: {new Date(status.lastUpdate.dishwashing.timestamp).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GitHub Actions情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              GitHub Actions 確認方法
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>GitHubリポジトリにアクセス</li>
              <li>「Actions」タブをクリック</li>
              <li>「Scheduled Product Scraping」を選択</li>
              <li>実行履歴から成功/失敗を確認</li>
            </ol>
            <p className="mt-4 text-sm text-blue-700">
              ※ 手動実行も可能です（Actions → Run workflow）
            </p>
          </div>

          {/* 更新ボタン */}
          <div className="mt-6 text-center">
            <button
              onClick={fetchStatus}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ステータスを更新
            </button>
          </div>
        </>
      )}
    </div>
  );
}