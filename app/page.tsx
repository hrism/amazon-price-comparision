import Link from 'next/link';
import { getToiletPaperProducts } from '@/lib/products/toilet-paper';
import { getDishwashingProducts } from '@/lib/products/dishwashing-liquid';
import { getMineralWaterProducts } from '@/lib/products/mineral-water';
import { calculateScore } from '@/lib/scoring';
import { calculateDishwashingScore } from '@/lib/scoring';
import { calculateMineralWaterScore } from '@/lib/scoring';
import { getAllPosts } from '@/lib/blog';

// 商品カード コンポーネント
function ProductCard({ product, category }: { product: any; category: string }) {
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '---';
    return `¥${price.toLocaleString()}`;
  };

  const getUnitPriceLabel = (category: string) => {
    switch(category) {
      case 'toilet-paper': return '/m';
      case 'dishwashing-liquid': return '/L';
      case 'mineral-water': return '/L';
      default: return '';
    }
  };

  const getUnitPrice = (product: any, category: string) => {
    switch(category) {
      case 'toilet-paper': return product.price_per_m;
      case 'dishwashing-liquid': return product.price_per_1000ml;
      case 'mineral-water': return product.price_per_liter;
      default: return null;
    }
  };

  const unitPrice = getUnitPrice(product, category);

  return (
    <Link href={`https://www.amazon.co.jp/dp/${product.asin}?tag=${process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22'}`} target="_blank" rel="noopener noreferrer">
      <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-lg transition-all">
        <div className="flex gap-3">
          <img
            src={product.image_url}
            alt={product.title}
            className="w-20 h-20 object-contain"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              {unitPrice && (
                <span className="text-lg font-bold text-green-600">
                  {formatPrice(unitPrice)}<span className="text-sm">/{getUnitPriceLabel(category)}</span>
                </span>
              )}
              <span className="text-sm text-gray-600">({formatPrice(product.price)})</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < Math.floor(product.review_avg || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 text-xs text-gray-600">{product.review_avg?.toFixed(1)}</span>
              </div>
              <span className="text-xs font-semibold text-blue-600">総合: {product.score?.toFixed(2)}点</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  // 各カテゴリの商品データを取得
  const [toiletPaperProducts, dishwashingProducts, mineralWaterProducts] = await Promise.all([
    getToiletPaperProducts(),
    getDishwashingProducts(),
    getMineralWaterProducts()
  ]);

  // ダブルのトイレットペーパーのみフィルタリング
  const doubleToiletPaper = toiletPaperProducts.filter((p: any) => p.is_double === true);

  // スコア計算
  const toiletPaperWithScores = doubleToiletPaper.map((product: any) => ({
    ...product,
    score: calculateScore(product, doubleToiletPaper)
  }));

  const dishwashingWithScores = dishwashingProducts.map((product: any) => ({
    ...product,
    score: calculateDishwashingScore(product, dishwashingProducts)
  }));

  const mineralWaterWithScores = mineralWaterProducts.map((product: any) => ({
    ...product,
    score: calculateMineralWaterScore(product, mineralWaterProducts)
  }));

  // 総合評価TOP3（ダブルのみ）
  const toiletPaperTop3 = [...toiletPaperWithScores]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  const dishwashingTop3 = [...dishwashingWithScores]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  const mineralWaterTop3 = [...mineralWaterWithScores]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  // 単価TOP3（ダブルのみ）
  const toiletPaperPriceTop3 = [...toiletPaperWithScores]
    .filter(p => p.price_per_m)
    .sort((a, b) => (a.price_per_m || 999999) - (b.price_per_m || 999999))
    .slice(0, 3);

  const dishwashingPriceTop3 = [...dishwashingWithScores]
    .filter(p => p.price_per_1000ml)
    .sort((a, b) => (a.price_per_1000ml || 999999) - (b.price_per_1000ml || 999999))
    .slice(0, 3);

  const mineralWaterPriceTop3 = [...mineralWaterWithScores]
    .filter(p => p.price_per_liter)
    .sort((a, b) => (a.price_per_liter || 999999) - (b.price_per_liter || 999999))
    .slice(0, 3);

  // 最新ブログ記事を取得
  const allPosts = await getAllPosts();
  const latestPosts = allPosts.slice(0, 3);

  const categories = [
    {
      name: 'トイレットペーパー',
      slug: 'toilet-paper',
      icon: '🧻',
      href: '/toilet-paper',
      scoreTop3: toiletPaperTop3,
      priceTop3: toiletPaperPriceTop3,
      productCount: toiletPaperProducts.length
    },
    {
      name: '食器用洗剤',
      slug: 'dishwashing-liquid',
      icon: '🧽',
      href: '/dishwashing-liquid',
      scoreTop3: dishwashingTop3,
      priceTop3: dishwashingPriceTop3,
      productCount: dishwashingProducts.length
    },
    {
      name: 'ミネラルウォーター',
      slug: 'mineral-water',
      icon: '💧',
      href: '/mineral-water',
      scoreTop3: mineralWaterTop3,
      priceTop3: mineralWaterPriceTop3,
      productCount: mineralWaterProducts.length
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">安く買う.com</h1>
          <p className="mt-2 text-gray-600">
            Amazonの日用品を単価で比較して、本当にお得な商品を見つけよう
          </p>
        </div>
      </header>

      {/* ナビゲーション */}
      <nav className="bg-gray-800 text-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-wrap items-center gap-3 md:gap-6 py-3 text-xs md:text-sm">
            <Link href="/" className="hover:text-yellow-400 whitespace-nowrap">🏠 ホーム</Link>
            <Link href="/toilet-paper" className="hover:text-yellow-400 whitespace-nowrap">🧻 トイレットペーパー</Link>
            <Link href="/dishwashing-liquid" className="hover:text-yellow-400 whitespace-nowrap">🧽 食器用洗剤</Link>
            <Link href="/mineral-water" className="hover:text-yellow-400 whitespace-nowrap">💧 ミネラルウォーター</Link>
            <Link href="/blog" className="hover:text-yellow-400 whitespace-nowrap">📝 ブログ</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* カテゴリ別ランキング */}
        {categories.map((category) => (
          <div key={category.slug} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <span className="text-3xl">{category.icon}</span>
              {category.name}
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 単価TOP3 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-green-500">💰</span>
                  単価が安い TOP3
                </h3>
                <div className="space-y-3">
                  {category.priceTop3.map((product, index) => (
                    <div key={product.asin} className="flex gap-2 items-start">
                      <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <ProductCard product={product} category={category.slug} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 総合評価TOP3 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  総合評価 TOP3
                </h3>
                <div className="space-y-3">
                  {category.scoreTop3.map((product, index) => (
                    <div key={product.asin} className="flex gap-2 items-start">
                      <div className="bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <ProductCard product={product} category={category.slug} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            <Link
              href={category.href}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium mb-8"
            >
              ランキングをもっと見る
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            </div>
            <hr/>
          </div>
        ))}

        {/* 最新ブログ記事 */}
        <div className="mt-16 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              📝 最新のブログ記事
            </h2>
            <Link
              href="/blog"
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              すべて見る
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {latestPosts.map((post: any) => {
              const categoryName = typeof post.category === 'string'
                ? (post.category === 'toilet-paper' ? 'トイレットペーパー'
                  : post.category === 'dishwashing-liquid' ? '食器用洗剤'
                  : post.category === 'mineral-water' ? 'ミネラルウォーター' : '')
                : post.category?.name || '';

              const publishedDate = post.published_at || post.publishedAt || post.created_at;

              return (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <article className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all h-full">
                    {post.featured_image && (
                      <div className="h-48 bg-gray-100 overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="text-xs text-blue-600 font-semibold mb-2">
                        {categoryName}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="mt-4 text-xs text-gray-500">
                        {publishedDate ? new Date(publishedDate).toLocaleDateString('ja-JP') : ''}
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              価格情報はAmazon.co.jpから自動取得しています。実際の価格は変動する場合があります。
            </p>
            <a
              href={`https://www.amazon.co.jp/?tag=${process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs hover:text-gray-700"
            >
              Amazonアソシエイト・プログラム参加中
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}