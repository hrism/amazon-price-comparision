/**
 * 商品ソート用のカスタムフック
 */

import { useState, useMemo } from 'react';
import { sortProducts, getSortOptions, SortableProduct } from '@/lib/sorting';

interface UseProductSortOptions<T> {
  defaultSortKey?: string;
  category: 'toilet_paper' | 'dishwashing_liquid' | 'mineral_water' | 'rice';
  calculateScore?: (product: T) => number;
}

export function useProductSort<T extends SortableProduct>(
  products: T[],
  options: UseProductSortOptions<T>
) {
  const { defaultSortKey = 'total_score', category, calculateScore } = options;
  const [sortBy, setSortBy] = useState(defaultSortKey);
  
  // ソートオプションを取得
  const sortOptions = useMemo(() => {
    return getSortOptions(category);
  }, [category]);
  
  // ソート済みの商品リスト
  const sortedProducts = useMemo(() => {
    return sortProducts(products, sortBy, calculateScore);
  }, [products, sortBy, calculateScore]);
  
  return {
    sortBy,
    setSortBy,
    sortOptions,
    sortedProducts
  };
}