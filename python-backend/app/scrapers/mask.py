from .base import BaseScraper
from typing import List, Dict, Any, Optional
import time


class MaskScraper(BaseScraper):
    """マスク用スクレイパー"""
    
    async def get_search_keyword(self) -> str:
        """検索キーワードを返す"""
        return "マスク"
    
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存商品を取得"""
        existing_dict = {}
        try:
            response = await self.db.get_mask_products()
            if response:
                for product in response:
                    existing_dict[product['asin']] = product
        except Exception as e:
            print(f"Error fetching existing mask products: {e}")
        return existing_dict
    
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた商品を取得"""
        try:
            products = await self.db.get_mask_products()
            
            # フィルタリング実装
            if filter == 'large_pack':
                products = [p for p in products if p.get('mask_count', 0) >= 50]
            elif filter == 'small_pack':
                products = [p for p in products if p.get('mask_count', 0) < 50]
            elif filter == 'sale':
                products = [p for p in products if p.get('on_sale')]
            
            # 単価でソート
            products.sort(key=lambda p: p.get('price_per_mask') or float('inf'))
            
            return products if products else []
        except Exception as e:
            print(f"Error fetching cached mask products: {e}")
            return []
    
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """商品データを処理"""
        asin = product['asin']
        existing = existing_products.get(asin)
        
        if existing and existing.get('mask_count') and existing.get('mask_size') and existing.get('mask_color'):
            # 既存商品で全データが揃っている場合は価格情報のみ更新
            price_per_mask = None
            if product.get('price') and existing['mask_count']:
                price_per_mask = product['price'] / existing['mask_count']
            
            return {
                'asin': asin,
                'title': product.get('title', existing.get('title', '')),
                'description': product.get('description', existing.get('description')),
                'brand': product.get('brand', existing.get('brand')),
                'image_url': product.get('image_url', existing.get('image_url')),
                'price': product.get('price'),
                'price_regular': product.get('price_regular') if product.get('price_regular') and product.get('price_regular') > 0 else None,
                'discount_percent': product.get('discount_percent'),
                'on_sale': product.get('on_sale', False),
                'review_avg': product.get('review_avg'),
                'review_count': product.get('review_count'),
                'mask_count': existing['mask_count'],
                'mask_size': existing.get('mask_size'),
                'mask_color': existing.get('mask_color'),
                'price_per_mask': price_per_mask
            }
        
        # 新商品または不完全な既存商品はChatGPTで解析
        print(f"Analyzing mask product: {asin}")
        
        extracted_info = await self.parser.extract_mask_info(
            product['title'], 
            product.get('description', '')
        )
        
        # mask_countがnullまたは0の場合はスキップ
        if not extracted_info.get('mask_count'):
            print(f"Skipping product with no mask count: {product.get('title', 'unknown')[:50]}")
            return None
        
        # 単価計算
        price_per_mask = None
        if product.get('price') and extracted_info.get('mask_count'):
            price_per_mask = product['price'] / extracted_info['mask_count']
        
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
            'mask_count': extracted_info.get('mask_count'),
            'mask_size': extracted_info.get('mask_size'),
            'mask_color': extracted_info.get('mask_color') or 'white',
            'price_per_mask': price_per_mask
        }
    
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """商品を保存"""
        if products:
            await self.db.save_mask_products(products)
    
    async def scrape(self, force: bool = False, filter: Optional[str] = None) -> Dict[str, Any]:
        """スクレイピング実行"""
        start_time = time.time()
        
        if not force:
            # キャッシュから取得
            products = await self.get_cached_products(filter)
            return {
                "status": "success",
                "count": len(products),
                "products": products,
                "from_cache": True,
                "time": round(time.time() - start_time, 2)
            }
        
        # 実際のスクレイピング
        keyword = await self.get_search_keyword()
        print(f"Starting mask scraping for keyword: {keyword}")
        
        # Amazon商品検索
        raw_products = await self.scraper.search_products(keyword)
        
        if not raw_products:
            return {
                "status": "success",
                "count": 0,
                "products": [],
                "time": round(time.time() - start_time, 2)
            }
        
        # 既存商品マップ取得
        existing_products = await self.get_existing_products()
        
        # 商品を処理
        processed_products = []
        new_count = 0
        updated_count = 0
        
        for product in raw_products:
            processed = await self.process_product(product, existing_products)
            if processed:
                processed_products.append(processed)
                if product['asin'] in existing_products:
                    updated_count += 1
                else:
                    new_count += 1
        
        print(f"Mask processing summary:")
        print(f"  - New products: {new_count}")
        print(f"  - Updated products: {updated_count}")
        print(f"  - Total processed: {len(processed_products)}")
        
        # データベースに保存
        await self.save_products(processed_products)
        
        # フィルタリング適用
        if filter:
            if filter == 'large_pack':
                processed_products = [p for p in processed_products if p.get('mask_count', 0) >= 50]
            elif filter == 'small_pack':
                processed_products = [p for p in processed_products if p.get('mask_count', 0) < 50]
            elif filter == 'sale':
                processed_products = [p for p in processed_products if p.get('on_sale')]
        
        # ソート（単価順）
        processed_products.sort(key=lambda p: p.get('price_per_mask') or float('inf'))
        
        print(f"Mask scraping completed: {len(processed_products)} products in {time.time() - start_time:.2f}s")
        
        return {
            "status": "success",
            "count": len(processed_products),
            "products": processed_products,
            "from_cache": False,
            "time": round(time.time() - start_time, 2)
        }