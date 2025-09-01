/**
 * 共通のソート関数
 */

export type CommonSortKey = 'total_score' | 'review_count' | 'review_avg';

export interface SortableProduct {
  total_score?: number;
  review_count?: number;
  review_avg?: number;
  price?: number;
  price_per_m?: number;
  price_per_roll?: number;
  price_per_1000ml?: number;
  price_per_liter?: number;
  price_per_kg?: number;
  discount_percent?: number;
}

/**
 * 共通のソートオプション
 */
export const COMMON_SORT_OPTIONS = [
  { value: 'total_score', label: '総合点が高い順' },
  { value: 'review_count', label: 'レビュー件数順' },
  { value: 'review_avg', label: 'レビュー点数順' },
];

/**
 * カテゴリ別の追加ソートオプション
 */
export const CATEGORY_SORT_OPTIONS = {
  toilet_paper: [
    { value: 'price_per_m', label: 'メートル単価が安い順' },
    { value: 'price_per_roll', label: 'ロール単価が安い順' },
    { value: 'discount_percent', label: '割引率が高い順' },
  ],
  dishwashing_liquid: [
    { value: 'price_per_1000ml', label: '1000ml単価が安い順' },
    { value: 'price', label: '価格が安い順' },
    { value: 'discount_percent', label: '割引率が高い順' },
  ],
  mineral_water: [
    { value: 'price_per_liter', label: 'リットル単価が安い順' },
    { value: 'price', label: '価格が安い順' },
    { value: 'discount_percent', label: '割引率が高い順' },
  ],
  rice: [
    { value: 'price_per_kg', label: 'kg単価が安い順' },
    { value: 'price', label: '価格が安い順' },
  ],
};

/**
 * 汎用ソート関数
 */
export function sortProducts<T extends SortableProduct>(
  products: T[],
  sortKey: string,
  calculateScore?: (product: T) => number
): T[] {
  return [...products].sort((a, b) => {
    switch (sortKey) {
      // 共通のソートキー
      case 'total_score':
        if (calculateScore) {
          const scoreA = calculateScore(a);
          const scoreB = calculateScore(b);
          return scoreB - scoreA; // 高い順
        }
        return (b.total_score || 0) - (a.total_score || 0);
      
      case 'review_count':
        return (b.review_count || 0) - (a.review_count || 0);
      
      case 'review_avg':
        return (b.review_avg || 0) - (a.review_avg || 0);
      
      // 価格系（安い順）
      case 'price':
        return (a.price || Infinity) - (b.price || Infinity);
      
      case 'price_per_m':
        return (a.price_per_m || Infinity) - (b.price_per_m || Infinity);
      
      case 'price_per_roll':
        return (a.price_per_roll || Infinity) - (b.price_per_roll || Infinity);
      
      case 'price_per_1000ml':
        return (a.price_per_1000ml || Infinity) - (b.price_per_1000ml || Infinity);
      
      case 'price_per_liter':
        return (a.price_per_liter || Infinity) - (b.price_per_liter || Infinity);
      
      case 'price_per_kg':
        return (a.price_per_kg || Infinity) - (b.price_per_kg || Infinity);
      
      // 割引率（高い順）
      case 'discount_percent':
        return (b.discount_percent || 0) - (a.discount_percent || 0);
      
      default:
        return 0;
    }
  });
}

/**
 * カテゴリに応じたソートオプションを取得
 */
export function getSortOptions(category: 'toilet_paper' | 'dishwashing_liquid' | 'mineral_water' | 'rice') {
  return [
    ...COMMON_SORT_OPTIONS,
    ...(CATEGORY_SORT_OPTIONS[category] || [])
  ];
}