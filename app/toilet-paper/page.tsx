'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/supabase';
import { getAmazonProductUrl } from '@/lib/amazon-link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import ReviewFilter from '@/components/ReviewFilter';
import CategoryBlogSection from '@/components/CategoryBlogSection';
import { categories } from '@/lib/categories';
import { productLabels, toiletPaperLabels } from '@/lib/labels';

type SortKey = 'price_per_m' | 'price_per_roll' | 'discount_percent';
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
  }, [filterType]);

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
          console.log('Scraping completed');
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
      console.log(`Refetching product: ${asin}`);
      
      // Next.jsのAPIルートを使用
      const apiUrl = '/api/refetch-product';
      const response = await fetch(`${apiUrl}/${asin}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refetch product: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`Refetch completed for ${asin}:`, result);
      
      // 商品リストを再取得してUIを更新
      await fetchProducts();
      
    } catch (err) {
      console.error(`Error refetching product ${asin}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to refetch product');
    } finally {
      setRefetchingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(asin);
        return newSet;
      });
    }
  };

  // レビュースコアでフィルタリング
  const filteredByReview = products.filter(product => {
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
        <div className="mb-6 text-left border-b border-gray-300 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <a 
              href={`https://www.amazon.co.jp/?tag=${process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22'}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img 
                src="/amazon-logo.svg" 
                alt="Amazon.co.jp" 
                className="h-8 w-auto"
              />
            </a>
            <h1 className="text-2xl font-normal" style={{ color: '#0F1111' }}>
              トイレットペーパー価格比較
            </h1>
          </div>
          <div className="text-sm space-y-2" style={{ color: '#565959' }}>
            <p>
              このページでは、Amazon.co.jpで販売されているトイレットペーパーを「1メートル単価」で比較できます。
              2倍巻き・3倍巻きなどの長巻きタイプも正確に計算し、本当にお得な商品を見つけることができます。
            </p>
            <p className="text-xs">
              💡 ポイント：表示価格は自動更新されます。セール情報や割引率も一目で確認できるので、タイミングを逃さずお買い物できます。
            </p>
          </div>
        </div>

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
                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      {productLabels.sort.label}
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="price_per_m">{toiletPaperLabels.sort.pricePerMeter}</option>
                      <option value="price_per_roll">{toiletPaperLabels.sort.pricePerRoll}</option>
                      <option value="discount_percent">{toiletPaperLabels.sort.discountPercent}</option>
                    </select>
                  </div>
                  
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
              {sortedProducts.map((product, index) => (
                <ProductCard
                  key={product.asin}
                  product={product}
                  index={index}
                  sortBy={sortBy}
                  isLocalhost={isLocalhost}
                  refetchingProducts={refetchingProducts}
                  onRefetch={refetchProduct}
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
              ))}
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