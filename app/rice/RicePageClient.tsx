'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductPageHeader from '@/components/ProductPageHeader';
import ShareButtons from '@/components/ShareButtons';
import SortSelector from '@/components/SortSelector';
import ReviewFilter from '@/components/ReviewFilter';
import ProductCard from '@/components/ProductCard';
import CategoryBlogSection from '@/components/CategoryBlogSection';
import CategoryGrid from '@/components/CategoryGrid';
import { categories } from '@/lib/categories';

interface RiceProduct {
  asin: string;
  title: string;
  brand?: string;
  price?: number;
  price_regular?: number;
  price_fresh?: number;
  price_fresh_regular?: number;
  is_fresh_available?: boolean;
  review_avg?: number;
  review_count?: number;
  image_url?: string;
  description?: string;
  weight_kg?: number;
  price_per_kg?: number;
  price_per_kg_fresh?: number;
  rice_type?: string;
  is_musenmai?: boolean;
  discount_percent?: number;
  discount_percent_fresh?: number;
  on_sale?: boolean;
  total_score?: number;
}

const productLabels = {
  unit: {
    base: '/kg',
    display: '1kgあたり'
  },
  status: {
    loading: '読み込み中',
    error: 'エラー'
  }
};

export default function RicePageClient() {
  const [products, setProducts] = useState<RiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('price_per_kg');
  const [minScore, setMinScore] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [useFresh, setUseFresh] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/rice/search?useFresh=${useFresh}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'データの取得に失敗しました');
        }

        setProducts(data.products || []);
        setLastUpdateTime(data.lastUpdate);
      } catch (err) {
        console.error('Error fetching rice products:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [useFresh]);

  const productsWithScores = useMemo(() => {
    const priceKey = useFresh ? 'price_per_kg_fresh' : 'price_per_kg';
    const allPrices = products.map((p: any) => p[priceKey]).filter((p): p is number => p != null && p > 0);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    return products.map(product => {
      const price = useFresh ? product.price_per_kg_fresh : product.price_per_kg;
      let totalScore = 3.0;

      if (product.review_avg && product.review_count && product.review_count > 0) {
        const reviewScore = product.review_avg;
        const priceScore = price && minPrice && maxPrice && maxPrice !== minPrice
          ? 5 * ((maxPrice - price) / (maxPrice - minPrice))
          : 2.5;

        totalScore = reviewScore * 0.7 + priceScore * 0.3;
      }

      return {
        ...product,
        total_score: totalScore
      };
    });
  }, [products, useFresh]);

  const sortedProducts = useMemo(() => {
    const filtered = productsWithScores.filter(product => {
      const reviewScore = product.review_avg || 0;
      return reviewScore >= minScore;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price_per_kg':
          const priceKeySort = useFresh ? 'price_per_kg_fresh' : 'price_per_kg';
          return (a[priceKeySort] || Infinity) - (b[priceKeySort] || Infinity);
        case 'total_score':
          return (b.total_score || 0) - (a.total_score || 0);
        case 'review_count':
          return (b.review_count || 0) - (a.review_count || 0);
        default:
          return 0;
      }
    });
  }, [productsWithScores, sortBy, minScore, useFresh]);

  const sortOptions = [
    { value: 'price_per_kg', label: '単価が安い順' },
    { value: 'total_score', label: '総合点が高い順' },
    { value: 'review_count', label: 'レビュー数順' }
  ];

  return (
    <main className="min-h-screen bg-white py-4">
      <div className="container mx-auto px-4">
        <ProductPageHeader
          title="で米を安く買う"
          description="Amazon.co.jpで販売されている米商品を1kgあたりの価格で比較。精米・無洗米を厳選して、本当にお得な商品を見つけましょう。"
          tip="米は保存期間と消費量を考慮して選びましょう。大容量のほうが単価は安くなりますが、保存状態に注意が必要です。"
        />

        <ShareButtons
          url="https://yasu-ku-kau.com/rice"
          title="米を1kgあたりの単価で比較 | 安く買う.com"
          description="Amazonで米を最安値で購入！1kgあたりの価格を一覧比較。"
        />

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setUseFresh(false)}
            className={`px-4 py-2 rounded-lg ${!useFresh ? 'bg-[#FF9900] text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            通常配送
          </button>
          <button
            onClick={() => setUseFresh(true)}
            className={`px-4 py-2 rounded-lg ${useFresh ? 'bg-[#FF9900] text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Amazon Fresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
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
        ) : sortedProducts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[#565959]">商品が見つかりませんでした</p>
          </div>
        ) : (
          <>
            <div className="bg-[#F7F8FA] border border-[#D5D9D9] rounded-2xl p-3 mb-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-normal text-[#0F1111]">
                    {sortedProducts.length}件の商品
                    {minScore > 0 && ` (★${minScore.toFixed(1)}以上)`}
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
                </div>
                <div className="flex flex-wrap gap-4">
                  <SortSelector
                    value={sortBy}
                    onChange={setSortBy}
                    options={sortOptions}
                    label="並び替え"
                  />
                  <ReviewFilter
                    value={minScore}
                    onChange={setMinScore}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {sortedProducts.slice(0, 20).map((product, index) => {
                const displayProduct = {
                  ...product,
                  price: useFresh && product.price_fresh ? product.price_fresh : product.price,
                  price_regular: useFresh && product.price_fresh_regular ? product.price_fresh_regular : product.price_regular,
                  price_per_kg: useFresh && product.price_per_kg_fresh ? product.price_per_kg_fresh : product.price_per_kg,
                  on_sale: product.on_sale || false,
                  discount_percent: (product.discount_percent && product.discount_percent > 0) ? product.discount_percent : undefined
                };

                return (
                  <ProductCard
                    key={product.asin}
                    product={displayProduct}
                    index={index}
                    sortBy={sortBy}
                    isLocalhost={false}
                    renderBadges={(p) => (
                      <>
                        {p.rice_type && (
                          <span className="px-2 py-0.5 text-[11px] bg-[#E5F4EA] text-[#0F1111] rounded-2xl border border-[#93C47D]">
                            {p.rice_type}
                          </span>
                        )}
                        {p.is_musenmai && (
                          <span className="px-2 py-0.5 text-[11px] bg-[#FFF4E5] text-[#0F1111] rounded-2xl border border-[#FFB366]">
                            無洗米
                          </span>
                        )}
                        {p.weight_kg && (
                          <span className="px-2 py-0.5 text-[11px] bg-[#F0F2F2] text-[#0F1111] rounded-2xl">
                            {p.weight_kg}kg
                          </span>
                        )}
                        {p.is_fresh_available && useFresh && (
                          <span className="px-2 py-0.5 text-[11px] bg-[#007600] text-white rounded-2xl">
                            Fresh対応
                          </span>
                        )}
                      </>
                    )}
                    renderUnitPrice={(p) => (
                      <>
                        <p className="text-[18px] font-medium text-[#B12704] leading-tight">
                          <span className="text-[13px]">¥</span>
                          {p.price_per_kg ? p.price_per_kg.toFixed(0) : '-'}
                          <span className="text-[11px]">/kg</span>
                        </p>
                      </>
                    )}
                    renderProductDetails={(p) => (
                      <>
                        {p.review_avg ? (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-3 h-3 ${i < Math.floor(p.review_avg || 0) ? 'text-[#FF9900]' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-[12px]">
                              {p.review_avg.toFixed(1)}
                              {p.review_count && p.review_count > 0 ? ` (${p.review_count}件)` : ' (レビューなし)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#565959]">レビューなし</span>
                        )}
                      </>
                    )}
                    totalScore={displayProduct.total_score}
                  />
                );
              })}
            </div>
          </>
        )}

        <CategoryBlogSection categorySlug="rice" />
        <CategoryGrid categories={categories} currentCategory="/rice" />
      </div>
    </main>
  );
}