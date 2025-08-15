from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
import json

class Database:
    def __init__(self):
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError("Supabase credentials not found in environment variables")
        
        self.supabase: Client = create_client(url, key)
        self.cache_duration = timedelta(hours=1)  # 1時間のキャッシュ
    
    async def get_cached_products(self, keyword: str, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた商品を取得"""
        try:
            # 1時間以内に更新された商品を取得
            cutoff_time = datetime.utcnow() - self.cache_duration
            
            query = self.supabase.table('products').select('*').gte(
                'updated_at', cutoff_time.isoformat()
            )
            
            # フィルタリング
            if filter == 'single':
                query = query.eq('is_double', False)
            elif filter == 'double':
                query = query.eq('is_double', True)
            elif filter == 'sale':
                query = query.eq('on_sale', True)
            
            # 単価でソート
            query = query.order('price_per_m', desc=False)
            
            response = query.execute()
            
            if response.data:
                return response.data
            return []
            
        except Exception as e:
            print(f"Error fetching cached products: {str(e)}")
            return []
    
    async def upsert_products(self, products: List[Any]) -> None:
        """商品データを更新または挿入"""
        try:
            # Pydanticモデルを辞書に変換
            products_data = []
            for product in products:
                product_dict = product.dict()
                # None値を除去（Supabaseはnull値を適切に処理）
                product_dict = {k: v for k, v in product_dict.items() if v is not None}
                product_dict['updated_at'] = datetime.utcnow().isoformat()
                products_data.append(product_dict)
            
            if not products_data:
                return
            
            # バッチでupsert（ASINをキーとして重複を避ける）
            response = self.supabase.table('products').upsert(
                products_data,
                on_conflict='asin'
            ).execute()
            
            print(f"Upserted {len(products_data)} products to database")
            
        except Exception as e:
            print(f"Error upserting products: {str(e)}")
            # エラーの詳細を表示
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                print(f"Error details: {e.response.text}")