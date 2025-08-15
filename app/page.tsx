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
  const [debugMode, setDebugMode] = useState(false);

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
      if (debugMode) {
        params.append('debug', 'true');
      }
      
      const response = await fetch(`http://127.0.0.1:8000/api/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      
      if (debugMode && data.debug) {
        console.log('=== デバッグ情報 ===');
        console.log('スクレイピングした商品数:', data.debug.totalScraped);
        console.log('処理した商品数:', data.debug.totalProcessed);
        console.log('フィルター後の商品数:', data.debug.totalFiltered);
        console.log('\n商品解析サンプル:');
        data.debug.sampleExtraction.forEach((item: any, index: number) => {
          console.log(`\n商品${index + 1}:`);
          console.log('  タイトル:', item.title);
          console.log('  ロール数:', item.rollCount);
          console.log('  長さ(m):', item.lengthM);
          console.log('  総長さ(m):', item.totalLengthM);
          console.log('  単価(円/m):', item.pricePerM);
          console.log('  ダブル:', item.isDouble);
        });
        setProducts(data.products);
      } else {
        setProducts(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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
          <p className="text-sm" style={{ color: '#565959' }}>
            Amazon内のトイレットペーパーを1m単価でランキング
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[16px] text-[#565959]">商品を読み込み中...</div>
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
                  <button
                    onClick={() => fetchProducts(true)}
                    disabled={loading}
                    className="px-4 py-1.5 text-[13px] bg-[#FFD814] text-[#0F1111] rounded-2xl hover:bg-[#F7CA00] disabled:bg-gray-300 disabled:cursor-not-allowed border border-[#FCD200] shadow-sm"
                  >
                    {loading ? '更新中...' : '最新データを取得'}
                  </button>
                  <button
                    onClick={() => {
                      setDebugMode(!debugMode);
                      console.log('デバッグモード:', !debugMode ? 'ON' : 'OFF');
                    }}
                    className={`px-3 py-1.5 text-[13px] rounded-2xl border ${
                      debugMode 
                        ? 'bg-[#007185] text-white hover:bg-[#005A6F] border-[#007185]' 
                        : 'bg-white text-[#0F1111] hover:bg-[#F7F8FA] border-[#D5D9D9]'
                    }`}
                  >
                    デバッグ: {debugMode ? 'ON' : 'OFF'}
                  </button>
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
                        onClick={() => {
                          if (debugMode) {
                            console.log('=== 商品詳細 ===');
                            console.log('ASIN:', product.asin);
                            console.log('タイトル:', product.title);
                            console.log('価格:', product.price);
                            console.log('ロール数:', product.roll_count);
                            console.log('長さ(m):', product.length_m);
                            console.log('総長さ(m):', product.total_length_m);
                            console.log('単価(円/m):', product.price_per_m);
                            console.log('単価(円/ロール):', product.price_per_roll);
                            console.log('ダブル:', product.is_double);
                          }
                        }}
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
                      
                      <div className="mt-3">
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