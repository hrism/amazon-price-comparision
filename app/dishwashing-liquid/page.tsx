'use client';

import { useEffect, useState } from 'react';
import { getAmazonProductUrl } from '@/lib/amazon-link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import ReviewFilter from '@/components/ReviewFilter';
import CategoryBlogSection from '@/components/CategoryBlogSection';
import { categories } from '@/lib/categories';
import { productLabels, dishwashingLiquidLabels } from '@/lib/labels';

type SortKey = 'price_per_1000ml' | 'price' | 'discount_percent';
type FilterType = 'all' | 'refill' | 'regular' | 'sale';

interface DishwashingProduct {
  asin: string;
  title: string;
  description?: string;
  brand?: string;
  image_url?: string;
  price?: number;
  price_regular?: number;
  discount_percent?: number;
  on_sale: boolean;
  review_avg?: number;
  review_count?: number;
  volume_ml?: number;
  price_per_1000ml?: number;
  is_refill?: boolean;
}

export default function DishwashingLiquid() {
  const [products, setProducts] = useState<DishwashingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('price_per_1000ml');
  const [filterType, setFilterType] = useState<FilterType>('all');
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
          body: JSON.stringify({ type: 'dishwashing_liquid' })
        });
        
        if (!scrapeResponse.ok) {
          console.error('Scraping failed:', await scrapeResponse.text());
        } else {
          console.log('Scraping completed');
        }
      }
      
      const params = new URLSearchParams({ keyword: '食器用洗剤' });
      if (filterType !== 'all') {
        params.append('filter', filterType);
      }
      
      // 統一APIエンドポイントを使用
      params.append('type', 'dishwashing_liquid');
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
      alert(`価格の再取得に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      case 'price_per_1000ml':
        return (a.price_per_1000ml || Infinity) - (b.price_per_1000ml || Infinity);
      case 'price':
        return (a.price || Infinity) - (b.price || Infinity);
      case 'discount_percent':
        return (b.discount_percent || 0) - (a.discount_percent || 0);
      default:
        return 0;
    }
  });

  const formatUnitPrice = (price?: number) => {
    if (!price) return '-';
    return `¥${price.toFixed(1)}`;
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
              食器用洗剤価格比較
            </h1>
          </div>
          <div className="text-sm space-y-2" style={{ color: '#565959' }}>
            <p>
              このページでは、Amazon.co.jpで販売されている食器用洗剤を「1000ml単価」で比較できます。
              詰め替え用と本体の価格差も一目瞭然。本当にお得な商品を見つけることができます。
            </p>
            <p className="text-xs">
              💡 ポイント：詰め替え用は環境にも優しく、多くの場合本体より単価が安くなっています。
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
                      <option value="price_per_1000ml">{dishwashingLiquidLabels.sort.pricePerLiter}</option>
                      <option value="price">{dishwashingLiquidLabels.sort.price}</option>
                      <option value="discount_percent">{dishwashingLiquidLabels.sort.discountPercent}</option>
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
                      <option value="refill">{dishwashingLiquidLabels.filter.refillOnly}</option>
                      <option value="regular">{dishwashingLiquidLabels.filter.regularOnly}</option>
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
                      {product.is_refill ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {dishwashingLiquidLabels.product.refill}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {dishwashingLiquidLabels.product.regular}
                        </span>
                      )}
                    </>
                  )}
                  renderUnitPrice={(product) => (
                    <p className="text-[17px] font-normal text-[#B12704]">
                      {formatUnitPrice(product.price_per_1000ml)}{dishwashingLiquidLabels.product.perLiter}
                    </p>
                  )}
                  renderProductDetails={(product) => (
                    <>
                      {product.volume_ml && (
                        <p>{dishwashingLiquidLabels.product.volume}: {product.volume_ml}{dishwashingLiquidLabels.product.milliliter}</p>
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
              categorySlug="dishwashing-liquid" 
              categoryName="食器用洗剤"
            />

            {/* 他カテゴリーへのリンク */}
            <CategoryGrid 
              categories={categories} 
              currentCategory="/dishwashing-liquid"
              title={productLabels.category.otherCategories}
              subtitle={productLabels.category.subtitle}
            />
          </>
        )}
      </div>
    </main>
  );
}