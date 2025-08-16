'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'scheduled';
  published_at?: string;
  created_at: string;
  view_count: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockUntil, setBlockUntil] = useState<Date | null>(null);

  useEffect(() => {
    checkUser();
    fetchPosts();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Admin posts:', data);
    console.log('Admin error:', error);

    if (!error && data) {
      setPosts(data);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    // ブロック状態をチェック
    if (isBlocked && blockUntil && new Date() < blockUntil) {
      const remainingTime = Math.ceil((blockUntil.getTime() - new Date().getTime()) / 1000 / 60 / 60);
      alert(`アカウントがロックされています。${remainingTime}時間後に再試行してください。`);
      return;
    }
    
    // ブロック時間が過ぎていれば解除
    if (isBlocked && blockUntil && new Date() >= blockUntil) {
      setIsBlocked(false);
      setBlockUntil(null);
      setLoginAttempts(0);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      // 失敗回数に応じた処理
      if (newAttempts >= 5) {
        // 5回失敗で48時間ブロック
        const blockTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
        setIsBlocked(true);
        setBlockUntil(blockTime);
        alert(`ログインに5回失敗しました。48時間アカウントがロックされます。`);
      } else if (newAttempts >= 3) {
        // 3回以上失敗で遅延
        const delay = Math.pow(2, newAttempts - 3) * 1000; // 2^(n-3) 秒
        setTimeout(() => {
          alert(`ログインエラー: ${error.message}\n${5 - newAttempts}回の試行が残っています。`);
        }, delay);
      } else {
        alert(`ログインエラー: ${error.message}\n${5 - newAttempts}回の試行が残っています。`);
      }
    } else {
      // ログイン成功時はカウンターをリセット
      setLoginAttempts(0);
      setIsBlocked(false);
      setBlockUntil(null);
      checkUser();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;
  }

  if (!user) {
    return <LoginForm onSignIn={handleSignIn} isBlocked={isBlocked} blockUntil={blockUntil} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理ダッシュボード</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            ログイン中: {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="mb-8 flex space-x-4">
        <Link
          href="/admin/post/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          新しい記事を作成
        </Link>
        <Link
          href="/admin/categories"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          カテゴリ・タグ管理
        </Link>
        <Link
          href="/admin/scrape-status"
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          スクレイピング状況
        </Link>
      </div>

      {/* 記事一覧 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">記事一覧</h2>
          
          {posts.length === 0 ? (
            <p className="text-gray-500">まだ記事がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      閲覧数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {post.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          /{post.slug}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          post.status === 'published' 
                            ? 'bg-green-100 text-green-800'
                            : post.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {post.status === 'published' ? '公開' : 
                           post.status === 'draft' ? '下書き' : '予約投稿'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.view_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          href={`/admin/post/${post.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          編集
                        </Link>
                        {post.status === 'published' && (
                          <Link
                            href={`/blog/${post.slug}`}
                            className="text-green-600 hover:text-green-900"
                          >
                            表示
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSignIn, isBlocked, blockUntil }: { 
  onSignIn: (email: string, password: string) => void;
  isBlocked: boolean;
  blockUntil: Date | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            管理画面にログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            記事の作成・編集には認証が必要です
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isBlocked}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isBlocked 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isBlocked ? 'アカウントロック中' : 'ログイン'}
            </button>
            {isBlocked && blockUntil && (
              <p className="mt-2 text-center text-sm text-red-600">
                {Math.ceil((blockUntil.getTime() - new Date().getTime()) / 1000 / 60 / 60)}時間後に再試行可能
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}