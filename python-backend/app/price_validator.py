"""
価格変動検証モジュール
単価が20%以上変動した場合に再解析フラグを立てる
"""
from typing import Dict, Any, Optional
from datetime import datetime

class PriceValidator:
    def __init__(self, variation_threshold: float = 0.20):
        """
        Args:
            variation_threshold: 価格変動の閾値（デフォルト20%）
        """
        self.variation_threshold = variation_threshold
    
    def needs_reverification(
        self, 
        current_price_per_m: Optional[float],
        last_price_per_m: Optional[float],
        on_sale: bool = False
    ) -> bool:
        """
        単価の再検証が必要かチェック
        
        Args:
            current_price_per_m: 現在の1mあたり価格
            last_price_per_m: 前回記録の1mあたり価格
            on_sale: セール中かどうか
            
        Returns:
            再検証が必要な場合True
        """
        # 前回価格がない場合は検証不要（初回）
        if not last_price_per_m or not current_price_per_m:
            return False
        
        # セール中は大幅な変動を許容
        if on_sale:
            return False
        
        # 価格変動率を計算
        variation_rate = abs(current_price_per_m - last_price_per_m) / last_price_per_m
        
        # 20%以上の変動があれば再検証必要
        if variation_rate >= self.variation_threshold:
            print(f"価格変動検出: {last_price_per_m:.2f} → {current_price_per_m:.2f} ({variation_rate:.1%}変動)")
            return True
        
        return False
    
    def validate_price_consistency(
        self,
        product: Dict[str, Any],
        previous_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        価格の一貫性を検証し、必要に応じて再検証フラグを設定
        
        Args:
            product: 現在の商品データ
            previous_data: DBに保存されている前回データ
            
        Returns:
            検証結果を含む更新データ
        """
        result = {
            'needs_verification': False,
            'last_verified_at': None
        }
        
        if not previous_data:
            # 初回データ
            result['last_price_per_m'] = product.get('price_per_m')
            result['last_price_per_roll'] = product.get('price_per_roll')
            result['last_verified_at'] = datetime.utcnow()
            return result
        
        current_price_per_m = product.get('price_per_m')
        last_price_per_m = previous_data.get('last_price_per_m')
        
        # 単価の再検証が必要かチェック
        if self.needs_reverification(
            current_price_per_m,
            last_price_per_m,
            product.get('on_sale', False)
        ):
            result['needs_verification'] = True
            print(f"ASIN {product.get('asin')}: 単価再検証が必要です")
        else:
            # 問題なければ現在の価格を記録
            result['last_price_per_m'] = current_price_per_m
            result['last_price_per_roll'] = product.get('price_per_roll')
            result['last_verified_at'] = datetime.utcnow()
        
        return result
    
    def get_suspicious_products(self, products: list) -> list:
        """
        疑わしい価格の商品をリストアップ
        
        Args:
            products: 商品リスト
            
        Returns:
            疑わしい商品のASINリスト
        """
        suspicious = []
        
        for product in products:
            price_per_m = product.get('price_per_m')
            
            # 異常に安い価格（1円/m未満）
            if price_per_m and price_per_m < 1.0:
                suspicious.append({
                    'asin': product.get('asin'),
                    'title': product.get('title'),
                    'price_per_m': price_per_m,
                    'reason': '価格が異常に安い（1円/m未満）'
                })
            
            # 異常に高い価格（20円/m以上）
            elif price_per_m and price_per_m > 20.0:
                suspicious.append({
                    'asin': product.get('asin'),
                    'title': product.get('title'),
                    'price_per_m': price_per_m,
                    'reason': '価格が異常に高い（20円/m以上）'
                })
        
        return suspicious