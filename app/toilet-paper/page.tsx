'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/supabase';
import { getAmazonProductUrl } from '@/lib/amazon-link';

type SortKey = 'price_per_m' | 'price_per_roll' | 'discount_percent';
type FilterType = 'all' | 'single' | 'double' | 'sale';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('price_per_m');
  const [filterType, setFilterType] = useState<FilterType>('double');
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
      const params = new URLSearchParams({ keyword: 'トイレットペーパー' });
      if (filterType !== 'all') {
        params.append('filter', filterType);
      }
      if (forceRefresh) {
        params.append('force', 'true');
      }
      
      const response = await fetch(`http://localhost:8000/api/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
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
    
    setRefetchingProducts(prev => new Set([...prev, asin]));
    
    try {
      console.log(`Refetching product: ${asin}`);
      
      const response = await fetch(`http://localhost:8000/api/refetch-product/${asin}`, {
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

  const sortedProducts = [...products].sort((a, b) => {
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

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return `¥${price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

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
            <div className="text-[16px] text-[#B12704]">エラー: {error}</div>
          </div>
        ) : (
          <>
            <div className="bg-[#F7F8FA] border border-[#D5D9D9] rounded-2xl p-3 mb-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-normal text-[#0F1111]">
                    {products.length}件の商品
                  </span>
                  {isLocalhost && (
                    <button
                      onClick={() => fetchProducts(true)}
                      disabled={loading}
                      className="px-4 py-1.5 text-[13px] bg-[#FFD814] text-[#0F1111] rounded-2xl hover:bg-[#F7CA00] disabled:bg-gray-300 disabled:cursor-not-allowed border border-[#FCD200] shadow-sm"
                    >
                      {loading ? '更新中...' : '価格を再取得'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      並び替え
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="price_per_m">1m単価（安い順）</option>
                      <option value="price_per_roll">1ロール単価（安い順）</option>
                      <option value="discount_percent">割引率（高い順）</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-normal text-[#565959] mb-1">
                      フィルター
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as FilterType)}
                      className="px-2 py-1 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] cursor-pointer"
                    >
                      <option value="all">すべて</option>
                      <option value="single">シングルのみ</option>
                      <option value="double">ダブルのみ</option>
                      <option value="sale">セール中のみ</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {sortedProducts.map((product, index) => (
                <div key={product.asin} className="bg-white border border-[#D5D9D9] rounded-2xl p-4 relative hover:shadow-md transition-shadow">
                  {index < 3 && sortBy === 'price_per_m' && (
                    <div className="absolute -top-2 -left-2 bg-[#FF9900] text-white font-bold text-[13px] rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                      {index + 1}位
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-2">
                      <a 
                        href={getAmazonProductUrl(product.asin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full max-w-[150px] mx-auto hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <div className="w-full max-w-[150px] h-[150px] mx-auto bg-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-300 transition-colors">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </a>
                    </div>
                    
                    <div className="md:col-span-6">
                      <a 
                        href={getAmazonProductUrl(product.asin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#C7511F] transition-colors"
                      >
                        <h3 className="text-[16px] font-normal mb-1 text-[#0F1111] hover:text-[#C7511F]">{product.title}</h3>
                      </a>
                      {product.brand && (
                        <p className="text-[12px] text-[#565959] mb-1">ブランド: <span className="text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">{product.brand}</span></p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.is_double !== null && (
                          <span className={`px-2 py-0.5 text-[11px] rounded-2xl ${
                            product.is_double 
                              ? 'bg-[#E3F2FD] text-[#0D47A1] border border-[#90CAF9]' 
                              : 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                          }`}>
                            {product.is_double ? 'ダブル' : 'シングル'}
                          </span>
                        )}
                        {product.on_sale && (
                          <span className="px-2 py-0.5 text-[11px] bg-[#CC0C39] text-white rounded-2xl">
                            セール中
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] text-[#565959] mb-0.5">販売価格</p>
                          <p className="text-[21px] font-normal text-[#0F1111] leading-tight">
                            <span className="text-[13px]">¥</span>{product.price?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </p>
                          {product.price_regular && product.price_regular > (product.price || 0) && (
                            <p className="text-[12px] text-[#565959] line-through">
                              {formatPrice(product.price_regular)}
                            </p>
                          )}
                          {product.discount_percent && (
                            <p className="text-[12px] text-[#CC0C39] font-normal">
                              {product.discount_percent}% OFF
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-[11px] text-[#565959] mb-0.5">単価</p>
                          <p className="text-[17px] font-normal text-[#B12704]">
                            {formatUnitPrice(product.price_per_m)}/m
                          </p>
                          <p className="text-[13px] text-[#565959]">
                            {formatUnitPrice(product.price_per_roll)}/ロール
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-[12px] text-[#565959]">
                        {product.roll_count && (
                          <p>総ロール数: {product.roll_count}ロール</p>
                        )}
                        {product.length_m && (
                          <p>1ロール: {product.length_m}m</p>
                        )}
                        {product.review_avg && (
                          <p className="flex items-center">
                            <span className="text-[#FF9900]">★</span> {product.review_avg} 
                            {product.review_count && (
                              <span className="ml-1">({product.review_count.toLocaleString()}件)</span>
                            )}
                          </p>
                        )}
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <a
                          href={getAmazonProductUrl(product.asin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-5 py-1.5 bg-[#FFD814] text-[#0F1111] text-[13px] rounded-2xl hover:bg-[#F7CA00] transition-colors border border-[#FCD200] shadow-sm"
                        >
                          Amazonで購入する
                          <svg className="ml-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {isLocalhost && (
                          <button
                            onClick={() => refetchProduct(product.asin)}
                            disabled={refetchingProducts.has(product.asin)}
                            className={`inline-flex items-center px-3 py-1.5 text-[13px] rounded-2xl transition-colors border shadow-sm ${
                              refetchingProducts.has(product.asin)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                                : 'bg-[#007185] text-white hover:bg-[#005A6F] border-[#007185]'
                            }`}
                          >
                            {refetchingProducts.has(product.asin) ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                更新中...
                              </>
                            ) : (
                              <>
                                <svg className="mr-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                再フェッチ
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}