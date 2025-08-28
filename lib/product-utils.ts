import {
  calculateToiletPaperScore,
  calculateDishwashingScore,
  calculateMineralWaterScore,
  calculateRiceScore,
  SCORE_WEIGHTS
} from './scoring';

export type ProductCategory = 'toilet-paper' | 'dishwashing-liquid' | 'mineral-water' | 'rice';

/**
 * 商品リストにスコアを追加する共通関数
 * @param products 商品リスト
 * @param category カテゴリ
 * @param scoreWeights スコアの重み（デフォルト: QUALITY_FOCUSED）
 */
export function addScoresToProducts(
  products: any[],
  category: ProductCategory,
  scoreWeights = SCORE_WEIGHTS.QUALITY_FOCUSED
): any[] {
  const { review: reviewWeight, price: priceWeight } = scoreWeights;

  return products.map(product => {
    let score: number;

    switch (category) {
      case 'toilet-paper':
        score = calculateToiletPaperScore(product, products, reviewWeight, priceWeight);
        break;
      case 'dishwashing-liquid':
        score = calculateDishwashingScore(product, products, reviewWeight, priceWeight);
        break;
      case 'mineral-water':
        score = calculateMineralWaterScore(product, products, reviewWeight, priceWeight);
        break;
      case 'rice':
        score = calculateRiceScore(product, products, reviewWeight, priceWeight);
        break;
      default:
        score = 0;
    }

    return {
      ...product,
      score
    };
  });
}

/**
 * 商品を総合点が高い順にソートする
 */
export function sortByScore<T extends { score?: number }>(products: T[]): T[] {
  return [...products].sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * 商品を単価順にソートする
 */
export function sortByUnitPrice<T extends { price_per_m?: number; price_per_1000ml?: number; price_per_liter?: number; price_per_kg?: number }>(
  products: T[],
  category: ProductCategory
): T[] {
  return [...products].sort((a, b) => {
    const getPrice = (product: T) => {
      switch (category) {
        case 'toilet-paper':
          return product.price_per_m || 999999;
        case 'dishwashing-liquid':
          return product.price_per_1000ml || 999999;
        case 'mineral-water':
          return product.price_per_liter || 999999;
        case 'rice':
          return product.price_per_kg || 999999;
        default:
          return 999999;
      }
    };

    return getPrice(a) - getPrice(b);
  });
}

/**
 * 商品の単価を取得する
 */
export function getUnitPrice(
  product: any,
  category: ProductCategory
): number | null {
  switch (category) {
    case 'toilet-paper':
      return product.price_per_m || null;
    case 'dishwashing-liquid':
      return product.price_per_1000ml || null;
    case 'mineral-water':
      return product.price_per_liter || null;
    case 'rice':
      return product.price_per_kg || null;
    default:
      return null;
  }
}

/**
 * 単価のラベルを取得する
 */
export function getUnitPriceLabel(category: ProductCategory): string {
  switch (category) {
    case 'toilet-paper':
      return '/m';
    case 'dishwashing-liquid':
      return '/L';
    case 'mineral-water':
      return '/L';
    case 'rice':
      return '/kg';
    default:
      return '';
  }
}