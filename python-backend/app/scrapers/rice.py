from .base import BaseScraper
from typing import List, Dict, Any, Optional
from .rice_scraper import scrape_rice
import time

class RiceScraper(BaseScraper):
    """米商品スクレイパー"""
    
    async def get_search_keyword(self) -> str:
        """検索キーワードを返す"""
        return "米"
    
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存の米商品を取得"""
        existing_dict = {}
        # rice_productsテーブルから全商品取得
        try:
            response = self.db.supabase.table('rice_products').select('*').execute()
            if response.data:
                for product in response.data:
                    existing_dict[product['asin']] = product
        except Exception as e:
            print(f"Error fetching existing rice products: {e}")
        return existing_dict
    
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた米商品を取得"""
        try:
            query = self.db.supabase.table('rice_products').select('*')
            
            # フィルタリング（必要に応じて追加）
            if filter == 'musenmai':
                query = query.eq('is_musenmai', True)
            elif filter == 'sale':
                query = query.eq('on_sale', True)
            
            # 単価でソート
            query = query.order('price_per_kg', desc=False)
            
            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching cached rice products: {e}")
            return []
    
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """米商品を処理する（既にrice_scraperで処理済みなのでそのまま返す）"""
        # rice_scraperで既に必要な処理が完了しているため、そのまま返す
        return product
    
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """米商品を保存する"""
        if products:
            await self.db.save_rice_products(products)
    
    async def scrape(self, force: bool = False, filter: Optional[str] = None) -> Dict[str, Any]:
        """米商品をスクレイピング"""
        start_time = time.time()
        
        # キャッシュチェック
        if not force:
            cached = await self.get_cached_products(filter)
            if cached:
                return {
                    "products": cached,
                    "from_cache": True,
                    "count": len(cached),
                    "time": 0
                }
        
        # スクレイピング実行
        print("Scraping rice products...")
        scraped_products = await scrape_rice("米")
        
        # 重複を除去（ASINでユニークにする）
        unique_products = {}
        for product in scraped_products:
            asin = product.get('asin')
            if asin and asin not in unique_products:
                unique_products[asin] = product
        
        scraped_products = list(unique_products.values())
        
        # 既存商品を取得して新規/更新をカウント
        existing_products = await self.get_existing_products()
        new_count = 0
        updated_count = 0
        
        for product in scraped_products:
            if product['asin'] in existing_products:
                updated_count += 1
            else:
                new_count += 1
        
        # 保存
        if scraped_products:
            await self.save_products(scraped_products)
        
        elapsed = time.time() - start_time
        
        return {
            "products": scraped_products,
            "from_cache": False,
            "count": len(scraped_products),
            "new": new_count,
            "updated": updated_count,
            "time": round(elapsed, 2)
        }