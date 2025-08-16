import Link from 'next/link';
import { categories } from '@/lib/categories';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Amazonスタイルのナビゲーションバー */}
      <nav className="bg-[#232F3E] text-white">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">安く買う.com</h1>
            <div className="text-sm text-gray-300">
              Powered by Amazon.co.jp
            </div>
          </div>
        </div>
      </nav>

      {/* サブナビゲーション */}
      <div className="bg-[#37475A] text-white py-2">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-6 text-sm">
            <span className="hover:text-[#FF9900] cursor-pointer">🏠 ホーム</span>
            <span className="hover:text-[#FF9900] cursor-pointer">📊 単価で比較</span>
            <span className="hover:text-[#FF9900] cursor-pointer">⭐ レビュー評価順</span>
            <span className="hover:text-[#FF9900] cursor-pointer">🔥 セール商品</span>
            <Link href="/blog" className="hover:text-[#FF9900] cursor-pointer">📝 ブログ</Link>
            <Link href="/admin" className="hover:text-[#FF9900] cursor-pointer">⚙️ 管理</Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-3xl font-normal text-[#0F1111] mb-2">
            カテゴリーを選択
          </h2>
          <p className="text-[#565959]">
            Amazon商品を単価で比較して、本当にお得な商品を見つけましょう
          </p>
        </div>

        {/* カテゴリグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.href}
              className={`relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 ${
                category.available ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : 'opacity-75'
              }`}
            >
              {category.available ? (
                <Link href={category.href} className="block p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{category.icon}</div>
                    {category.available && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        利用可能
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {category.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{category.stats.products} 商品</span>
                    <span>{category.stats.updated}</span>
                  </div>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                    比較を開始
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ) : (
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl opacity-50">{category.icon}</div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      準備中
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 opacity-75">
                    {category.title}
                  </h2>
                  <p className="text-gray-500 text-sm mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{category.stats.products}</span>
                    <span>{category.stats.updated}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* フッター情報 */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-700">
              価格情報はAmazon.co.jpから自動取得しています。
              実際の価格は変動する場合があります。
            </p>
          </div>
        </div>

        {/* Amazon提携表示 */}
        <div className="mt-8 flex justify-center">
          <a
            href={`https://www.amazon.co.jp/?tag=${process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <img
              src="/amazon-logo.svg"
              alt="Amazon.co.jp"
              className="h-4 w-auto opacity-50"
            />
            <span>Amazonアソシエイト・プログラム参加中</span>
          </a>
        </div>
      </div>
    </main>
  );
}