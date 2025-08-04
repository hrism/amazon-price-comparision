'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/supabase';

type SortKey = 'price_per_m' | 'price_per_roll' | 'discount_percent';
type FilterType = 'all' | 'single' | 'double' | 'sale';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('price_per_m');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    fetchProducts();
  }, [filterType]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ keyword: 'トイレットペーパー' });
      if (filterType !== 'all') {
        params.append('filter', filterType);
      }
      
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data);
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
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">
            トイレットペーパー価格比較
          </h1>
          <p className="text-lg text-gray-600">
            Amazon内のトイレットペーパーを1m単価でランキング
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl">商品を読み込み中...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-red-600">エラー: {error}</div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="text-lg font-semibold">
                  {products.length}件の商品
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      並び替え
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="price_per_m">1m単価（安い順）</option>
                      <option value="price_per_roll">1ロール単価（安い順）</option>
                      <option value="discount_percent">割引率（高い順）</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      フィルター
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as FilterType)}
                      className="px-4 py-2 border border-gray-300 rounded-md"
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

            <div className="space-y-4">
              {sortedProducts.map((product, index) => (
                <div key={product.asin} className="bg-white rounded-lg shadow-md p-6 relative">
                  {index < 3 && sortBy === 'price_per_m' && (
                    <div className="absolute -top-3 -left-3 bg-yellow-400 text-black font-bold rounded-full w-12 h-12 flex items-center justify-center">
                      {index + 1}位
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-2">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full max-w-[150px] mx-auto"
                        />
                      )}
                    </div>
                    
                    <div className="md:col-span-6">
                      <h3 className="text-lg font-semibold mb-2">{product.title}</h3>
                      {product.brand && (
                        <p className="text-sm text-gray-600 mb-1">ブランド: {product.brand}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.is_double !== null && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            product.is_double 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.is_double ? 'ダブル' : 'シングル'}
                          </span>
                        )}
                        {product.on_sale && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                            セール中
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">販売価格</p>
                          <p className="text-xl font-bold">
                            {formatPrice(product.price)}
                          </p>
                          {product.price_regular && product.price_regular > (product.price || 0) && (
                            <p className="text-sm text-gray-500 line-through">
                              {formatPrice(product.price_regular)}
                            </p>
                          )}
                          {product.discount_percent && (
                            <p className="text-sm text-red-600 font-semibold">
                              {product.discount_percent}% OFF
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">単価</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatUnitPrice(product.price_per_m)}/m
                          </p>
                          <p className="text-sm text-gray-700">
                            {formatUnitPrice(product.price_per_roll)}/ロール
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm">
                        {product.roll_count && (
                          <p>総ロール数: {product.roll_count}ロール</p>
                        )}
                        {product.length_m && (
                          <p>1ロール: {product.length_m}m</p>
                        )}
                        {product.review_avg && (
                          <p className="flex items-center">
                            評価: ⭐{product.review_avg} 
                            {product.review_count && (
                              <span className="ml-1">({product.review_count}件)</span>
                            )}
                          </p>
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