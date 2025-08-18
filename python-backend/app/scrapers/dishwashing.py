from typing import Dict, Any, Optional, List
from .base import BaseScraper

class DishwashingScraper(BaseScraper):
    """食器用洗剤専用スクレイパー"""
    
    async def get_search_keyword(self) -> str:
        return "食器用洗剤"
    
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存の食器用洗剤商品を取得（現在は毎回新規取得）"""
        # 食器用洗剤は現在、価格比較をしていないので空を返す
        return {}
    
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた食器用洗剤商品を取得"""
        return await self.db.get_all_dishwashing_products(filter)
    
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """食器用洗剤商品を処理"""
        # ChatGPT解析
        extracted_info = await self.parser.extract_dishwashing_info(
            product['title'], 
            product.get('description', '')
        )
        
        # 食洗機用製品はスキップ
        if extracted_info.get('is_dishwasher', False):
            return None
        
        # volume_mlがない場合もスキップ
        if not extracted_info.get('volume_ml'):
            return None
        
        # 単価計算
        price_per_1000ml = None
        if product.get('price') and extracted_info.get('volume_ml'):
            price_per_1000ml = (product['price'] / extracted_info['volume_ml']) * 1000
        
        return {
            'asin': product['asin'],
            'title': product.get('title', ''),
            'description': product.get('description'),
            'brand': product.get('brand'),
            'image_url': product.get('image_url'),
            'price': product.get('price'),
            'price_regular': product.get('price_regular') if product.get('price_regular') and product.get('price_regular') > 0 else None,
            'discount_percent': product.get('discount_percent'),
            'on_sale': product.get('on_sale', False),
            'review_avg': product.get('review_avg'),
            'review_count': product.get('review_count'),
            'volume_ml': extracted_info.get('volume_ml'),
            'price_per_1000ml': price_per_1000ml,
            'is_refill': extracted_info.get('is_refill', False)
        }
    
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """食器用洗剤商品を保存"""
        await self.db.save_dishwashing_products(products)