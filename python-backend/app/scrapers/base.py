from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseScraper(ABC):
    """商品スクレイパーの基底クラス"""
    
    def __init__(self, scraper, parser, db):
        self.scraper = scraper
        self.parser = parser
        self.db = db
    
    @abstractmethod
    async def get_search_keyword(self) -> str:
        """検索キーワードを返す"""
        pass
    
    @abstractmethod
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """商品データを処理する"""
        pass
    
    @abstractmethod
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """商品データを保存する"""
        pass
    
    @abstractmethod
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた商品を取得する"""
        pass
    
    async def scrape(self, force: bool = False, filter: Optional[str] = None) -> Dict[str, Any]:
        """スクレイピングを実行する共通処理"""
        import time
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
        keyword = await self.get_search_keyword()
        print(f"Scraping {keyword}...")
        scraped_products = await self.scraper.search_products(keyword)
        
        # 既存商品を取得
        existing_products = await self.get_existing_products()
        
        # 商品を処理
        processed_products = []
        new_count = 0
        updated_count = 0
        
        for product in scraped_products:
            if not product.get('title'):
                continue
            
            result = await self.process_product(product, existing_products)
            if result:
                processed_products.append(result)
                if product['asin'] in existing_products:
                    updated_count += 1
                else:
                    new_count += 1
        
        # 保存
        if processed_products:
            await self.save_products(processed_products)
        
        elapsed = time.time() - start_time
        
        return {
            "products": processed_products,
            "from_cache": False,
            "count": len(processed_products),
            "new": new_count,
            "updated": updated_count,
            "time": round(elapsed, 2)
        }
    
    @abstractmethod
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存商品を取得する"""
        pass