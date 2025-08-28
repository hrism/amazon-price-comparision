"""
総合点スコアの計算ユーティリティ
"""
from typing import List, Dict, Optional


def calculate_adjusted_review_score(
    review_avg: Optional[float],
    review_count: Optional[int],
    C: float = 10,  # 信頼性パラメータ（最小レビュー数の閾値）
    m: float = 3.5  # 全商品の平均レビュー点数の推定値
) -> float:
    """ベイズ平均を使用した調整レビュースコアの計算"""
    if not review_count or not review_avg:
        return m

    return (review_count * review_avg + C * m) / (review_count + C)


def calculate_price_score(
    current_price: float,
    min_price: float,
    max_price: float
) -> float:
    """単価スコアの計算（0-5の範囲に正規化）"""
    if max_price == min_price:
        return 2.5  # 全商品が同じ価格の場合は中間値

    # 価格が低いほどスコアが高くなる（0-5の範囲）
    return ((max_price - current_price) / (max_price - min_price)) * 5


def calculate_total_score(
    product: Dict,
    all_products: List[Dict],
    price_field: str,
    review_weight: float = 0.7,
    price_weight: float = 0.3
) -> Optional[float]:
    """
    総合点スコアを計算

    Args:
        product: 商品データ
        all_products: 全商品データ（価格の最小/最大値計算用）
        price_field: 価格フィールド名（'price_per_m', 'price_per_1000ml', 'price_per_liter'）
        review_weight: レビュースコアの重み（デフォルト: 0.7）
        price_weight: 価格スコアの重み（デフォルト: 0.3）

    Returns:
        総合スコア（0-5の範囲）、計算できない場合はNone
    """
    # 単価を取得
    current_price = product.get(price_field)
    if current_price is None or current_price <= 0:
        # 価格情報がない場合はレビュースコアのみ
        adjusted_review = calculate_adjusted_review_score(
            product.get('review_avg'),
            product.get('review_count')
        )
        return adjusted_review

    # 有効な価格のリストを作成
    valid_prices = [
        p.get(price_field) for p in all_products
        if p.get(price_field) is not None and p.get(price_field) > 0
    ]

    if not valid_prices:
        return None

    min_price = min(valid_prices)
    max_price = max(valid_prices)

    # 調整レビュースコアの計算
    adjusted_review_score = calculate_adjusted_review_score(
        product.get('review_avg'),
        product.get('review_count')
    )

    # 単価スコアの計算
    price_score = calculate_price_score(current_price, min_price, max_price)

    # 重み付けして総合スコアを計算
    total_score = adjusted_review_score * review_weight + price_score * price_weight

    # 0-5の範囲に収める
    return min(5.0, max(0.0, total_score))


def calculate_all_scores(
    products: List[Dict],
    price_field: str,
    review_weight: float = 0.7,
    price_weight: float = 0.3
) -> List[Dict]:
    """
    全商品の総合スコアを計算して追加

    Args:
        products: 商品リスト
        price_field: 価格フィールド名
        review_weight: レビュースコアの重み
        price_weight: 価格スコアの重み

    Returns:
        total_scoreフィールドが追加された商品リスト
    """
    for product in products:
        score = calculate_total_score(
            product,
            products,
            price_field,
            review_weight,
            price_weight
        )
        product['total_score'] = round(score, 2) if score is not None else None

    return products