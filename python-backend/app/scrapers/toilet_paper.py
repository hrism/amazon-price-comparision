from typing import Dict, Any, Optional, List
from .base import BaseScraper
from ..main import Product

class ToiletPaperScraper(BaseScraper):
    """トイレットペーパー専用スクレイパー"""
    
    async def get_search_keyword(self) -> str:
        return "トイレットペーパー"
    
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存のトイレットペーパー商品を取得"""
        existing_dict = {}
        all_existing = await self.db.get_all_products()
        for existing in all_existing:
            existing_dict[existing['asin']] = existing
        return existing_dict
    
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされたトイレットペーパー商品を取得"""
        return await self.db.get_all_cached_products(filter)
    
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """トイレットペーパー商品を処理"""
        asin = product['asin']
        existing = existing_products.get(asin)
        
        if existing:
            # 既存商品：価格変更チェック
            if existing.get('price') == product.get('price'):
                # 価格変更なし
                return Product(
                    asin=existing['asin'],
                    title=existing['title'],
                    description=existing.get('description'),
                    brand=existing.get('brand'),
                    image_url=existing.get('image_url'),
                    price=existing.get('price'),
                    price_regular=existing.get('price_regular'),
                    discount_percent=existing.get('discount_percent'),
                    on_sale=existing.get('on_sale', False),
                    review_avg=existing.get('review_avg'),
                    review_count=existing.get('review_count'),
                    roll_count=existing.get('roll_count'),
                    length_m=existing.get('length_m'),
                    total_length_m=existing.get('total_length_m'),
                    price_per_roll=existing.get('price_per_roll'),
                    price_per_m=existing.get('price_per_m'),
                    is_double=existing.get('is_double')
                )
            
            # 価格変更あり：単価再計算
            price_per_roll = None
            price_per_m = None
            
            if product.get('price') and existing.get('roll_count'):
                price_per_roll = product['price'] / existing['roll_count']
            
            if product.get('price') and existing.get('total_length_m'):
                price_per_m = product['price'] / existing['total_length_m']
            
            return Product(
                asin=asin,
                title=existing['title'],
                description=existing.get('description'),
                brand=existing.get('brand'),
                image_url=product.get('image_url'),
                price=product.get('price'),
                price_regular=product.get('price_regular'),
                discount_percent=product.get('discount_percent'),
                on_sale=product.get('on_sale', False),
                review_avg=product.get('review_avg'),
                review_count=product.get('review_count'),
                roll_count=existing.get('roll_count'),
                length_m=existing.get('length_m'),
                total_length_m=existing.get('total_length_m'),
                price_per_roll=price_per_roll,
                price_per_m=price_per_m,
                is_double=existing.get('is_double')
            )
        
        # 新商品：ChatGPT解析
        extracted_info = await self.parser.extract_info(
            product['title'], 
            product.get('description', '')
        )
        
        # 単価計算
        price_per_roll = None
        price_per_m = None
        
        if product.get('price') and extracted_info['roll_count']:
            price_per_roll = product['price'] / extracted_info['roll_count']
        
        if product.get('price') and extracted_info['total_length_m']:
            price_per_m = product['price'] / extracted_info['total_length_m']
        
        return Product(
            asin=product['asin'],
            title=product.get('title', ''),
            description=product.get('description'),
            brand=product.get('brand'),
            image_url=product.get('image_url'),
            price=product.get('price'),
            price_regular=product.get('price_regular'),
            discount_percent=product.get('discount_percent'),
            on_sale=product.get('on_sale', False),
            review_avg=product.get('review_avg'),
            review_count=product.get('review_count'),
            roll_count=int(extracted_info['roll_count']) if extracted_info['roll_count'] else None,
            length_m=extracted_info['length_m'],
            total_length_m=extracted_info['total_length_m'],
            price_per_roll=price_per_roll,
            price_per_m=price_per_m,
            is_double=extracted_info['is_double']
        )
    
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """トイレットペーパー商品を保存（総合スコア計算含む）"""
        # 総合スコアを計算
        from app.utils.score_calculator import calculate_all_scores
        products_with_scores = calculate_all_scores(products, 'price_per_m')
        
        # データベースに保存
        await self.db.upsert_products(products_with_scores)