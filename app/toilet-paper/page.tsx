'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/supabase';
import { getAmazonProductUrl } from '@/lib/amazon-link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import ReviewFilter from '@/components/ReviewFilter';
import CategoryBlogSection from '@/components/CategoryBlogSection';
import ProductPageHeader from '@/components/ProductPageHeader';
import ShareButtons from '@/components/ShareButtons';
import SortSelector from '@/components/SortSelector';
import { categories } from '@/lib/categories';
import { productLabels, toiletPaperLabels } from '@/lib/labels';
import { calculateToiletPaperScore, SCORE_WEIGHTS } from '@/lib/scoring';

type SortKey = 'price_per_m' | 'price_per_roll' | 'discount_percent' | 'total_score';
type FilterType = 'all' | 'single' | 'double' | 'sale';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('price_per_m');
  const [filterType, setFilterType] = useState<FilterType>('double');
  const [minReviewScore, setMinReviewScore] = useState<number>(0);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [refetchingProducts, setRefetchingProducts] = useState<Set<string>>(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  useEffect(() => {
    // localhost環境かチェック
    setIsLocalhost(
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.startsWith('192.168.'))
    );
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchLastUpdateTime();
  }, [filterType]);

  const fetchLastUpdateTime = async () => {
    try {
      const response = await fetch('/api/scrape-status');
      if (response.ok) {
        const data = await response.json();
        if (data.lastUpdate?.toiletPaper?.timestamp) {
          setLastUpdateTime(data.lastUpdate.toiletPaper.timestamp);
        }
      }
    } catch (error) {
      console.error('Failed to fetch last update time:', error);
    }
  };

  const fetchProducts = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // forceRefreshの場合、先にスクレイピングを実行
      if (forceRefresh && isLocalhost) {
        console.log('Starting scraping...');
        const scrapeResponse = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'toilet_paper' })
        });

        if (!scrapeResponse.ok) {
          console.error('Scraping failed:', await scrapeResponse.text());
        } else {
          const result = await scrapeResponse.json();
          console.log('Scraping completed:', result);
          // スクレイピング完了後、少し待ってからデータを取得
          if (result.success) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      const params = new URLSearchParams({ keyword: 'トイレットペーパー' });
      if (filterType !== 'all') {
        params.append('filter', filterType);
      }

      // 統一APIエンドポイントを使用
      params.append('type', 'toilet_paper');
      const apiUrl = '/api/products';
      const response = await fetch(`${apiUrl}?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refetchProduct = async (asin: string) => {
    if (refetchingProducts.has(asin)) return; // 既に処理中の場合はスキップ

    setRefetchingProducts(prev => {
      const newSet = new Set(prev);
      newSet.add(asin);
      return newSet;
    });

    try {
      console.log(`Refetching all toilet paper products via Lambda`);

      // Lambda関数経由でスクレイピング実行
      const response = await fetch('/api/lambda-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_types: ['toilet_paper'],
          force_scrape: true,
          scrape_token: process.env.NEXT_PUBLIC_SCRAPE_TOKEN
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refetch products: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Lambda scraping completed:`, result);

      // 商品リストを再取得してUIを更新
      await fetchProducts();

    } catch (err) {
      console.error(`Error refetching products:`, err);
      setError(err instanceof Error ? err.message : 'Failed to refetch products');
    } finally {
      setRefetchingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(asin);
        return newSet;
      });
    }
  };

  // レビュースコアと単価データでフィルタリング
  const filteredByReview = products.filter(product => {
    // 単価が取得できていない商品を除外（price_per_mまたはprice_per_rollが有効な値を持つ）
    const hasValidPrice = (product.price_per_m && product.price_per_m > 0) || 
                         (product.price_per_roll && product.price_per_roll > 0);
    if (!hasValidPrice) return false;
    
    // レビュースコアでフィルタリング
    if (minReviewScore === 0) return true;
    return (product.review_avg || 0) >= minReviewScore;
  });

  const sortedProducts = [...filteredByReview].sort((a, b) => {
    switch (sortBy) {
      case 'price_per_m':
        return (a.price_per_m || Infinity) - (b.price_per_m || Infinity);
      case 'price_per_roll':
        return (a.price_per_roll || Infinity) - (b.price_per_roll || Infinity);
      case 'discount_percent':
        return (b.discount_percent || 0) - (a.discount_percent || 0);
      case 'total_score':
        // 総合評価スコアの計算（高い順）
        const scoreA = calculateToiletPaperScore(a, filteredByReview, SCORE_WEIGHTS.QUALITY_FOCUSED.review, SCORE_WEIGHTS.QUALITY_FOCUSED.price);
        const scoreB = calculateToiletPaperScore(b, filteredByReview, SCORE_WEIGHTS.QUALITY_FOCUSED.review, SCORE_WEIGHTS.QUALITY_FOCUSED.price);
        return scoreB - scoreA; // 高い順
      default:
        return 0;
    }
  });

  const formatUnitPrice = (price?: number) => {
    if (!price) return '-';
    return `¥${price.toFixed(2)}`;
  };

  return (
    <main className="min-h-screen bg-white py-4">
      <div className="container mx-auto px-4">
        <ProductPageHeader
          title="でトイレットペーパーを安く買う"
          description="このページでは、Amazon.co.jpで販売されているトイレットペーパーを「1メートル単価」で比較できます。2倍巻き・3倍巻きなどの長巻きタイプも正確に計算し、本当にお得な商品を見つけることができます。"
          tip="表示価格は自動更新されます。セール情報や割引率も一目で確認できるので、タイミングを逃さずお買い物できます。"
        />
        
        {/* SNSシェアボタン */}
        <ShareButtons 
          url="https://www.yasu-ku-kau.com/toilet-paper"
          title="トイレットペーパーの最安値を探す | 安く買う.com"
          description="Amazon内のトイレットペーパーを1メートル単価で比較。本当にお得な商品を見つけよう！"
        />

        {loading ? (
          <div className="space-y-3">
            {/* スケルトンローダー */}
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white border border-[#D5D9D9] rounded-2xl p-4 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-2">
                    <div className="w-full max-w-[150px] h-[150px] mx-auto bg-gray-200 rounded"></div>
                  </div>
                  <div className="md:col-span-6">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="flex gap-2">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                      <div className="h-5 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div>
                        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-9 bg-gray-200 rounded-2xl w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[16px] text-[#B12704]">{productLabels.status.error}: {error}</div>
          </div>
        ) : (
          <>
            <div className="bg-[#F7F8FA] border border-[#D5D9D9] rounded-2xl p-3 mb-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-normal text-[#0F1111]">
                    {filteredByReview.length}{productLabels.status.productsCount}
                    {minReviewScore > 0 && ` (★${minReviewScore.toFixed(1)}以上)`}
                  </span>
                  {lastUpdateTime && (
                    <span className="text-[11px] text-[#565959]">
                      最終更新: {new Date(lastUpdateTime).toLocaleString('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                  {isLocalhost && (
                    <button
                      onClick={() => fetchProducts(true)}
                      disabled={loading}
                      className="px-4 py-1.5 text-[13px] bg-[#FFD814] text-[#0F1111] rounded-2xl hover:bg-[#F7CA00] disabled:bg-gray-300 disabled:cursor-not-allowed border border-[#FCD200] shadow-sm"
                    >
                      {loading ? productLabels.cta.refetching : productLabels.cta.priceRefresh}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <SortSelector
                    value={sortBy}
                    onChange={(value) => setSortBy(value as SortKey)}
                    label={productLabels.sort.label}
                    options={[
                      { value: 'total_score', label: '総合評価順' },
                      { value: 'price_per_m', label: toiletPaperLabels.sort.pricePerMeter },
                      { value: 'price_per_roll', label: toiletPaperLabels.sort.pricePerRoll },
                      { value: 'discount_percent', label: toiletPaperLabels.sort.discountPercent },
                    ]}
                  />

                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      {productLabels.filter.label}
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as FilterType)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="all">{productLabels.filter.all}</option>
                      <option value="single">{toiletPaperLabels.filter.singleOnly}</option>
                      <option value="double">{toiletPaperLabels.filter.doubleOnly}</option>
                      <option value="sale">{productLabels.filter.saleOnly}</option>
                    </select>
                  </div>

                  <ReviewFilter
                    value={minReviewScore}
                    onChange={setMinReviewScore}
                    productCount={filteredByReview.length}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {sortedProducts.slice(0, 20).map((product, index) => {
                let totalScore;
                try {
                  totalScore = calculateToiletPaperScore(product, filteredByReview, SCORE_WEIGHTS.QUALITY_FOCUSED.review, SCORE_WEIGHTS.QUALITY_FOCUSED.price);
                  if (!isFinite(totalScore)) {
                    console.warn('Invalid score for product:', product.asin, totalScore);
                    totalScore = 0;
                  }
                } catch (error) {
                  console.error('Error calculating score for product:', product.asin, error);
                  totalScore = 0;
                }
                
                return (
                  <ProductCard
                    key={product.asin}
                    product={product}
                    index={index}
                    sortBy={sortBy}
                    isLocalhost={isLocalhost}
                    refetchingProducts={refetchingProducts}
                    onRefetch={refetchProduct}
                    totalScore={totalScore}
                  renderBadges={(product) => (
                    <>
                      {product.is_double !== null && (
                        <span className={`px-2 py-0.5 text-[11px] rounded-2xl ${
                          product.is_double
                            ? 'bg-[#E3F2FD] text-[#0D47A1] border border-[#90CAF9]'
                            : 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                        }`}>
                          {product.is_double ? toiletPaperLabels.product.double : toiletPaperLabels.product.single}
                        </span>
                      )}
                    </>
                  )}
                  renderUnitPrice={(product) => (
                    <>
                      <p className="text-[17px] font-normal text-[#B12704]">
                        {formatUnitPrice(product.price_per_m)}{toiletPaperLabels.product.perMeter}
                      </p>
                      <p className="text-[13px] text-[#565959]">
                        {formatUnitPrice(product.price_per_roll)}{toiletPaperLabels.product.perRoll}
                      </p>
                    </>
                  )}
                  renderProductDetails={(product) => (
                    <>
                      {product.roll_count && (
                        <p>{toiletPaperLabels.product.totalRolls}: {product.roll_count}{toiletPaperLabels.product.rolls}</p>
                      )}
                      {product.length_m && (
                        <p>{toiletPaperLabels.product.rollLength}: {product.length_m}{toiletPaperLabels.product.meter}</p>
                      )}
                      {product.review_avg && (
                        <p className="flex items-center">
                          <span className="text-[#FF9900]">★</span> {product.review_avg}
                          {product.review_count && (
                            <span className="ml-1">({product.review_count.toLocaleString()}件)</span>
                          )}
                        </p>
                      )}
                    </>
                  )}
                  />
                );
              })}
            </div>

            {/* セクション区切り */}
            <div className="my-12 border-t border-[#E3E6E6]"></div>

            {/* ブログ記事セクション */}
            <CategoryBlogSection
              categorySlug="toilet-paper"
              categoryName="トイレットペーパー"
            />

            {/* 他カテゴリーへのリンク */}
            <CategoryGrid
              categories={categories}
              currentCategory="/toilet-paper"
              title={productLabels.category.otherCategories}
              subtitle={productLabels.category.subtitle}
            />
          </>
        )}
      </div>
    </main>
  );
}