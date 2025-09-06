/**
 * 総合点スコアの計算ロジック
 */

interface ProductWithScore {
  price_per_m?: number;
  price_per_1000ml?: number;
  price_per_liter?: number;
  price_per_kg?: number;
  price_per_mask?: number;
  review_avg?: number;
  review_count?: number;
  price_score?: number;
  review_score?: number;
  total_score?: number;
}

/**
 * ベイズ平均を使用した調整レビュースコアの計算
 */
function calculateAdjustedReviewScore(
  reviewAvg: number | undefined,
  reviewCount: number | undefined,
  C: number = 100, // 信頼性パラメータ（最小レビュー数の閾値）- レビュー件数の影響を大幅に抑制
  m: number = 3.8 // 全商品の平均レビュー点数の推定値（やや高めに設定）
): number {
  if (!reviewCount || !reviewAvg) {
    return m; // レビューがない場合は平均値を返す
  }

  // ベイズ平均の計算
  return (reviewCount * reviewAvg + C * m) / (reviewCount + C);
}

/**
 * 単価スコアの計算（0-5の範囲に正規化）
 */
function calculatePriceScore(
  currentPrice: number,
  minPrice: number,
  maxPrice: number
): number {
  if (maxPrice === minPrice) {
    return 2.5; // 全商品が同じ価格の場合は中間値
  }

  // 価格が低いほどスコアが高くなる（0-5の範囲）
  return ((maxPrice - currentPrice) / (maxPrice - minPrice)) * 5;
}

/**
 * 汎用的な総合点スコア計算関数
 */
function calculateGenericScore(
  product: ProductWithScore,
  allProducts: ProductWithScore[],
  priceField: keyof ProductWithScore,
  reviewWeight: number = 0.5,
  priceWeight: number = 0.5
): number {
  // 単価の最小値・最大値を取得
  const validPrices = allProducts
    .map(p => p[priceField] as number | undefined)
    .filter((price): price is number => price !== undefined && price > 0);

  const productPrice = product[priceField] as number | undefined;

  if (validPrices.length === 0 || !productPrice) {
    // 価格情報がない場合は調整レビュースコアに0.5を掛けてペナルティを与える
    // これにより、価格不明の商品が不当に高いランキングになるのを防ぐ
    const adjustedReview = calculateAdjustedReviewScore(product.review_avg, product.review_count);
    return adjustedReview * 0.5; // 最大でも2.5点に制限
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);

  // 調整レビュースコアの計算（ベイズ平均でレビュー件数を考慮）
  const adjustedReviewScore = calculateAdjustedReviewScore(
    product.review_avg,
    product.review_count
  );

  // 単価スコアの計算
  const priceScore = calculatePriceScore(productPrice, minPrice, maxPrice);

  // 重み付けして総合スコアを計算
  return adjustedReviewScore * reviewWeight + priceScore * priceWeight;
}

/**
 * トイレットペーパー用の総合点スコア計算
 */
export function calculateToiletPaperScore(
  product: ProductWithScore,
  allProducts: ProductWithScore[],
  reviewWeight: number = 0.5,
  priceWeight: number = 0.5
): number {
  return calculateGenericScore(product, allProducts, 'price_per_m', reviewWeight, priceWeight);
}

/**
 * 洗剤用の総合点スコア計算
 */
export function calculateDishwashingScore(
  product: ProductWithScore,
  allProducts: ProductWithScore[],
  reviewWeight: number = 0.5,
  priceWeight: number = 0.5
): number {
  return calculateGenericScore(product, allProducts, 'price_per_1000ml', reviewWeight, priceWeight);
}

/**
 * ミネラルウォーター用の総合点スコア計算
 */
export function calculateMineralWaterScore(
  product: ProductWithScore & { price_per_liter?: number },
  allProducts: (ProductWithScore & { price_per_liter?: number })[] = [],
  reviewWeight = 0.5,
  priceWeight = 0.5
): number {
  return calculateGenericScore(product, allProducts, 'price_per_liter', reviewWeight, priceWeight);
}

/**
 * マスク用の総合点スコア計算
 */
export function calculateMaskScore(
  product: ProductWithScore,
  allProducts: ProductWithScore[] = [],
  reviewWeight = 0.5,
  priceWeight = 0.5
): number {
  return calculateGenericScore(product, allProducts, 'price_per_mask', reviewWeight, priceWeight);
}

/**
 * 米用の総合点スコア計算
 */
export function calculateRiceScore(
  product: ProductWithScore & { price_per_kg?: number },
  allProducts: (ProductWithScore & { price_per_kg?: number })[] = [],
  reviewWeight = 0.5,
  priceWeight = 0.5
): number {
  return calculateGenericScore(product, allProducts, 'price_per_kg', reviewWeight, priceWeight);
}

// Alias for toilet paper for backward compatibility
export const calculateScore = calculateToiletPaperScore;

/**
 * スコアの重み付けプリセット
 */
export const SCORE_WEIGHTS = {
  // バランス型（デフォルト）
  BALANCED: { review: 0.5, price: 0.5 },
  // 品質重視
  QUALITY_FOCUSED: { review: 0.7, price: 0.3 },
  // コスパ重視
  PRICE_FOCUSED: { review: 0.3, price: 0.7 },
} as const;