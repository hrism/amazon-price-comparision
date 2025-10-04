'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import ReviewFilter from '@/components/ReviewFilter';
import ShareButtons from '@/components/ShareButtons';
import SortSelector from '@/components/SortSelector';
import CategoryGrid from '@/components/CategoryGrid';
import ProductPageHeader from '@/components/ProductPageHeader';
import CategoryBlogSection from '@/components/CategoryBlogSection';
import { categories } from '@/lib/categories';
import { productLabels } from '@/lib/labels';
import { calculateMaskScore, SCORE_WEIGHTS } from '@/lib/scoring';

type SortKey = 'price_per_mask' | 'price' | 'discount_percent' | 'total_score';
type PackFilterType = 'all' | 'large_pack' | 'small_pack' | 'sale';
type SizeFilterType = 'all' | 'large' | 'slightly_large' | 'regular' | 'slightly_small' | 'small' | 'kids' | 'unknown';
type ColorFilterType = 'all' | 'white' | 'black' | 'gray' | 'pink' | 'blue' | 'beige' | 'purple' | 'green' | 'yellow' | 'multicolor';

interface MaskProduct {
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
  mask_count?: number;
  mask_size?: 'large' | 'slightly_large' | 'regular' | 'slightly_small' | 'small' | 'kids' | null;
  mask_color?: 'white' | 'black' | 'gray' | 'pink' | 'blue' | 'beige' | 'purple' | 'green' | 'yellow' | 'multicolor' | null;
  price_per_mask?: number;
  last_fetched_at?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Mask() {
  const [allProducts, setAllProducts] = useState<MaskProduct[]>([]);  // 全商品データを保持
  const [products, setProducts] = useState<MaskProduct[]>([]);  // フィルター後の商品データ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('total_score');
  const [packFilter, setPackFilter] = useState<PackFilterType>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilterType>('all');
  const [colorFilter, setColorFilter] = useState<ColorFilterType>('all');
  const [minReviewScore, setMinReviewScore] = useState<number>(0);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [refetchingProducts, setRefetchingProducts] = useState<Set<string>>(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [availableFilters, setAvailableFilters] = useState<{
    colors: Array<{value: string, count: number, label: string}>,
    sizes: Array<{value: string, count: number, label: string}>
  }>({ colors: [], sizes: [] });

  useEffect(() => {
    // localhost環境かチェック
    setIsLocalhost(
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.startsWith('192.168.'))
    );
    
    // 初回読み込み時にデータとフィルターオプションを並列取得
    Promise.all([
      fetchProducts(),
      fetchFilters()
    ]);
  }, []);

  // フィルター変更時はクライアント側でフィルタリング（APIは呼ばない）
  useEffect(() => {
    applyFilters();
  }, [packFilter, sizeFilter, colorFilter, allProducts]);

  // フィルターオプションを取得
  const fetchFilters = async () => {
    try {
      const response = await fetch('/api/mask/filters');
      if (response.ok) {
        const data = await response.json();
        setAvailableFilters(data);
      }
    } catch (err) {
      console.error('Failed to fetch filters:', err);
    }
  };

  // クライアント側でフィルタリングを適用（最適化）
  const applyFilters = () => {
    if (allProducts.length === 0) return;
    
    const filtered = allProducts.filter(product => {
      // 容量フィルター
      if (packFilter === 'large_pack' && (!product.mask_count || product.mask_count < 50)) return false;
      if (packFilter === 'small_pack' && (product.mask_count && product.mask_count >= 50)) return false;
      if (packFilter === 'sale' && !product.on_sale) return false;
      
      // サイズフィルター
      if (sizeFilter !== 'all') {
        if (sizeFilter === 'unknown' && product.mask_size) return false;
        if (sizeFilter !== 'unknown' && product.mask_size !== sizeFilter) return false;
      }
      
      // カラーフィルター
      if (colorFilter !== 'all' && product.mask_color !== colorFilter) return false;
      
      return true;
    });
    
    setProducts(filtered);
  };

  // 商品データを再取得
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
          body: JSON.stringify({ type: 'mask' })
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

      // 全商品を取得（フィルターなし）
      const params = new URLSearchParams({ keyword: 'マスク' });
      
      // mask専用APIエンドポイントを使用
      const apiUrl = '/api/mask/search';
      const response = await fetch(`${apiUrl}?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched mask data:', { type: typeof data, length: Array.isArray(data) ? data.length : 'not array' });

      // APIレスポンスがオブジェクトの場合はproductsプロパティを使用
      const productsArray = Array.isArray(data) ? data : (data.products || []);
      setAllProducts(productsArray);  // 全商品データを保存
      
      // 初回読み込み時も現在のフィルターを適用
      if (packFilter === 'all' && sizeFilter === 'all' && colorFilter === 'all') {
        setProducts(productsArray);  // フィルターがない場合は全商品を表示
      } else {
        // フィルターがある場合は適用（初回読み込み後すぐにapplyFiltersが呼ばれる）
        setProducts(productsArray);  // 一旦全商品を設定（useEffectでフィルタリングされる）
      }
      
      // APIレスポンスのlastUpdateフィールドを使用
      if (data.lastUpdate) {
        setLastUpdateTime(data.lastUpdate);
      } else if (productsArray && productsArray.length > 0) {
        // フォールバック: 商品データから最新のlast_fetched_atを取得
        const latest = productsArray.reduce((prev: any, current: any) => {
          const prevDate = new Date(prev.last_fetched_at || prev.updated_at || 0);
          const currentDate = new Date(current.last_fetched_at || current.updated_at || 0);
          return currentDate > prevDate ? current : prev;
        });
        setLastUpdateTime(latest.last_fetched_at || latest.updated_at || null);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 個別の商品を再取得
  const refetchProduct = async (asin: string) => {
    if (refetchingProducts.has(asin)) return;

    setRefetchingProducts(prev => {
      const newSet = new Set(prev);
      newSet.add(asin);
      return newSet;
    });

    try {
      const response = await fetch(`/api/refetch-product/${asin}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Product refetch failed');
      }

      const updatedProduct = await response.json();
      if (updatedProduct) {
        setProducts(prev => prev.map(p => p.asin === asin ? updatedProduct : p));
      }
    } catch (error) {
      console.error('Error refetching product:', error);
    } finally {
      setRefetchingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(asin);
        return newSet;
      });
    }
  };


  // レビュースコアと単価データでフィルタリング（最適化）
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 単価が取得できていない商品を除外
      if (!product.price_per_mask || product.price_per_mask <= 0) return false;
      
      // レビュースコアでフィルタリング
      if (minReviewScore > 0 && (product.review_avg || 0) < minReviewScore) return false;
      
      return true;
    });
  }, [products, minReviewScore]);

  // ソート（最適化）
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price_per_mask':
          return (a.price_per_mask || Infinity) - (b.price_per_mask || Infinity);
        case 'price':
          return (a.price || Infinity) - (b.price || Infinity);
        case 'discount_percent':
          return (b.discount_percent || 0) - (a.discount_percent || 0);
        case 'total_score':
          // 総合点スコアの計算（高い順）
          const scoreA = calculateMaskScore(a, filteredProducts, SCORE_WEIGHTS.QUALITY_FOCUSED.review, SCORE_WEIGHTS.QUALITY_FOCUSED.price);
          const scoreB = calculateMaskScore(b, filteredProducts, SCORE_WEIGHTS.QUALITY_FOCUSED.review, SCORE_WEIGHTS.QUALITY_FOCUSED.price);
          return scoreB - scoreA; // 高い順
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortBy]);

  const formatUnitPrice = (price?: number) => {
    if (!price || price === 0) return '---';
    return price < 1 ? `¥${price.toFixed(2)}` : `¥${price.toFixed(1)}`;
  };

  return (
    <main className="min-h-screen bg-white py-4">
      <div className="container mx-auto px-4">
        <ProductPageHeader
          title="でマスクを安く買う"
          description="このページでは、Amazon.co.jpで販売されているマスクを「1枚単価」で比較できます。大容量パックでお得になる商品や、高評価のブランド商品まで幅広く比較できます。"
          tip="表示価格は自動更新されます。セール情報や割引率も一目で確認できるので、タイミングを逃さずお買い物できます。"
        />

        <ShareButtons
          url="https://www.yasu-ku-kau.com/mask"
          title="マスクの最安値を探す | 安く買う.com"
          description="Amazon内のマスクを1枚単価で比較。本当にお得な商品を見つけよう！"
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
                    {filteredProducts.length}{productLabels.status.productsCount}
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
                      { value: 'total_score', label: '総合点が高い順' },
                      { value: 'price_per_mask', label: '1枚あたり価格' },
                      { value: 'price', label: '価格' },
                      { value: 'discount_percent', label: '割引率' },
                    ]}
                  />

                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      容量
                    </label>
                    <select
                      value={packFilter}
                      onChange={(e) => setPackFilter(e.target.value as PackFilterType)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="all">{productLabels.filter.all}</option>
                      <option value="large_pack">大容量(50枚以上)</option>
                      <option value="small_pack">少量(50枚未満)</option>
                      <option value="sale">{productLabels.filter.saleOnly}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      サイズ
                    </label>
                    <select
                      value={sizeFilter}
                      onChange={(e) => setSizeFilter(e.target.value as SizeFilterType)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="all">すべて</option>
                      {availableFilters.sizes.map(size => (
                        <option key={size.value} value={size.value}>
                          {size.label} ({size.count}件)
                        </option>
                      ))}
                      <option value="unknown">サイズ表記なし</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      カラー
                    </label>
                    <select
                      value={colorFilter}
                      onChange={(e) => setColorFilter(e.target.value as ColorFilterType)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="all">すべて</option>
                      {availableFilters.colors.map(color => (
                        <option key={color.value} value={color.value}>
                          {color.label} ({color.count}件)
                        </option>
                      ))}
                    </select>
                  </div>

                  <ReviewFilter
                    value={minReviewScore}
                    onChange={setMinReviewScore}
                    productCount={filteredProducts.length}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {sortedProducts.slice(0, 20).map((product, index) => {
                const totalScore = calculateMaskScore(product, filteredProducts, SCORE_WEIGHTS.QUALITY_FOCUSED.review, SCORE_WEIGHTS.QUALITY_FOCUSED.price);
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
                        {product.mask_count && product.mask_count >= 50 && (
                          <span className="px-2 py-0.5 text-[11px] rounded-2xl bg-[#E3F2FD] text-[#0D47A1] border border-[#90CAF9]">
                            大容量
                          </span>
                        )}
                        {product.mask_size && (
                          <span className="px-2 py-0.5 text-[11px] rounded-2xl bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]">
                            {product.mask_size === 'large' && '大きめ'}
                            {product.mask_size === 'slightly_large' && 'やや大きめ'}
                            {product.mask_size === 'regular' && 'ふつう'}
                            {product.mask_size === 'slightly_small' && 'やや小さめ'}
                            {product.mask_size === 'small' && '小さめ'}
                            {product.mask_size === 'kids' && '子供用'}
                          </span>
                        )}
                        {product.mask_color && product.mask_color !== 'white' && (
                          <span className="px-2 py-0.5 text-[11px] rounded-2xl bg-[#F3E5F5] text-[#7B1FA2] border border-[#CE93D8]">
                            {product.mask_color === 'black' && 'ブラック'}
                            {product.mask_color === 'gray' && 'グレー'}
                            {product.mask_color === 'pink' && 'ピンク'}
                            {product.mask_color === 'blue' && 'ブルー'}
                            {product.mask_color === 'beige' && 'ベージュ'}
                            {product.mask_color === 'purple' && 'パープル'}
                            {product.mask_color === 'green' && 'グリーン'}
                            {product.mask_color === 'yellow' && 'イエロー'}
                            {product.mask_color === 'multicolor' && 'マルチカラー'}
                          </span>
                        )}
                      </>
                    )}
                    renderUnitPrice={(product) => (
                      <>
                        <p className="text-[17px] font-normal text-[#B12704]">
                          {formatUnitPrice(product.price_per_mask)}/枚
                        </p>
                        {product.mask_count && (
                          <p className="text-[13px] text-[#565959]">
                            {product.mask_count}枚入り
                          </p>
                        )}
                      </>
                    )}
                    renderProductDetails={(product) => (
                      <>
                        {product.mask_count && (
                          <p>枚数: {product.mask_count}枚</p>
                        )}
                        {product.review_avg && (
                          <p className="flex items-center">
                            <span className="text-[#FF9900]">★</span> {product.review_avg.toFixed(1)}
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

            {sortedProducts.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-[16px] text-[#565959]">{productLabels.status.noProducts}</div>
              </div>
            )}

            {/* セクション区切り */}
            <div className="my-12 border-t border-[#E3E6E6]"></div>

            {/* ブログ記事セクション */}
            <CategoryBlogSection
              categorySlug="mask"
              categoryName="マスク"
            />

            {/* 他カテゴリーへのリンク */}
            <CategoryGrid
              categories={categories}
              currentCategory="/mask"
              title={productLabels.category.otherCategories}
              subtitle={productLabels.category.subtitle}
            />
          </>
        )}
      </div>
    </main>
  );
}