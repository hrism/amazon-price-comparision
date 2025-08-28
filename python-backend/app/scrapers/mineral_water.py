from .base import BaseScraper
from typing import Dict, List, Optional, Any
import asyncio
from datetime import datetime, timezone
import time

class MineralWaterScraper(BaseScraper):
    """ミネラルウォーター用スクレイパー"""
    
    async def get_search_keyword(self) -> str:
        """検索キーワードを返す"""
        return "ミネラルウォーター"
    
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存の商品データを取得"""
        result = self.db.table("mineral_water_products").select("*").execute()
        return {p['asin']: p for p in (result.data or [])}
    
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """商品データを処理する"""
        from ..prompts.mineral_water import parse_mineral_water_info
        
        asin = product['asin']
        existing = existing_products.get(asin)
        
        # 既存商品で価格変更なしの場合はスキップ
        if existing and existing.get('price') == product.get('price'):
            return existing
        
        # 新規商品または価格変更ありの場合は詳細取得
        if not existing:
            # 詳細ページから情報を取得
            detail_info = await self.scraper.get_product_detail(asin)
            if detail_info:
                product.update(detail_info)
            
            # GPTで解析
            description = product.get('description', '') + ' ' + product.get('features', '')
            title = product.get('title', '')
            
            if title and description:
                extracted = await parse_mineral_water_info(title, description)
                if extracted:
                    product.update(extracted)
        else:
            # 既存商品の情報を使用
            product.update({
                'capacity_ml': existing.get('capacity_ml'),
                'bottle_count': existing.get('bottle_count'),
                'total_capacity_l': existing.get('total_capacity_l'),
                'water_type': existing.get('water_type'),
                'hardness': existing.get('hardness')
            })
        
        # 単価計算
        if product.get('price') and product.get('total_capacity_l'):
            product['price_per_liter'] = product['price'] / product['total_capacity_l']
        
        # タイムスタンプ追加
        product['last_fetched_at'] = datetime.now(timezone.utc).isoformat()
        
        return product
    
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """商品データを保存する（総合スコア計算含む）"""
        # 総合スコアを計算
        from app.utils.score_calculator import calculate_all_scores
        products_with_scores = calculate_all_scores(products, 'price_per_liter')
        
        # データベースに保存
        from .mineral_water_scraper import save_mineral_water_to_db
        if products_with_scores:
            save_mineral_water_to_db(products_with_scores)
    
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた商品を取得する"""
        import datetime
        
        one_hour_ago = datetime.datetime.now(timezone.utc) - datetime.timedelta(hours=1)
        
        query = self.db.table("mineral_water_products").select("*")
        
        # last_fetched_atが1時間以内のデータを確認
        result = query.execute()
        if result.data:
            recent_products = []
            for p in result.data:
                if p.get('last_fetched_at'):
                    try:
                        fetched_at = datetime.datetime.fromisoformat(p['last_fetched_at'].replace('Z', '+00:00'))
                        if fetched_at > one_hour_ago:
                            recent_products.append(p)
                    except:
                        pass
            
            if len(recent_products) > 10:  # 10件以上あればキャッシュを使用
                return recent_products
        
        return []