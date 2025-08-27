/**
 * 総合評価スコアの計算ロジック
 */

interface ProductWithScore {
  price_per_m?: number;
  price_per_1000ml?: number;
  price_per_liter?: number;
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
  C: number = 10, // 信頼性パラメータ（最小レビュー数の閾値）
  m: number = 3.5 // 全商品の平均レビュー点数の推定値
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
 * トイレットペーパー用の総合評価スコア計算
 */
export function calculateToiletPaperScore(
  product: ProductWithScore,
  allProducts: ProductWithScore[],
  reviewWeight: number = 0.5,
  priceWeight: number = 0.5
): number {
  // 単価の最小値・最大値を取得
  const validPrices = allProducts
    .map(p => p.price_per_m)
    .filter((price): price is number => price !== undefined && price > 0);
  
  if (validPrices.length === 0 || !product.price_per_m) {
    // 価格情報がない場合はレビュースコアのみ
    return calculateAdjustedReviewScore(product.review_avg, product.review_count);
  }
  
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  
  // 調整レビュースコアの計算
  const adjustedReviewScore = calculateAdjustedReviewScore(
    product.review_avg,
    product.review_count
  );
  
  // 単価スコアの計算
  const priceScore = calculatePriceScore(product.price_per_m, minPrice, maxPrice);
  
  // 重み付けして総合スコアを計算
  return adjustedReviewScore * reviewWeight + priceScore * priceWeight;
}

/**
 * 洗剤用の総合評価スコア計算
 */
export function calculateDishwashingScore(
  product: ProductWithScore,
  allProducts: ProductWithScore[],
  reviewWeight: number = 0.5,
  priceWeight: number = 0.5
): number {
  // 単価の最小値・最大値を取得
  const validPrices = allProducts
    .map(p => p.price_per_1000ml)
    .filter((price): price is number => price !== undefined && price > 0);
  
  if (validPrices.length === 0 || !product.price_per_1000ml) {
    // 価格情報がない場合はレビュースコアのみ
    return calculateAdjustedReviewScore(product.review_avg, product.review_count);
  }
  
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  
  // 調整レビュースコアの計算
  const adjustedReviewScore = calculateAdjustedReviewScore(
    product.review_avg,
    product.review_count
  );
  
  // 単価スコアの計算
  const priceScore = calculatePriceScore(product.price_per_1000ml, minPrice, maxPrice);
  
  // 重み付けして総合スコアを計算
  return adjustedReviewScore * reviewWeight + priceScore * priceWeight;
}

/**
 * ミネラルウォーター用の総合評価スコア計算（他商品と統一した5点満点方式）
 */
export function calculateMineralWaterScore(
  product: ProductWithScore & { price_per_liter?: number },
  allProducts: (ProductWithScore & { price_per_liter?: number })[] = [],
  reviewWeight = 0.5,
  priceWeight = 0.5
): number {
  let score = 0;

  // レビュースコア (0-5点)
  if (product.review_avg && product.review_avg > 0) {
    score += product.review_avg * reviewWeight;
  }

  // 価格スコア (0-5点)
  if (product.price_per_liter && product.price_per_liter > 0 && allProducts.length > 0) {
    const prices = allProducts
      .filter(p => p.price_per_liter && p.price_per_liter > 0)
      .map(p => p.price_per_liter!);
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (maxPrice !== minPrice) {
        // 安い方が高得点
        const priceScore = ((maxPrice - product.price_per_liter) / (maxPrice - minPrice)) * 5;
        score += priceScore * priceWeight;
      } else {
        score += 2.5 * priceWeight; // 全て同じ価格の場合は中間点
      }
    }
  }

  return Math.min(5, score); // 最大5点
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