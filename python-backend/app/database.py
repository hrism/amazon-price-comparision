from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
import json
from dotenv import load_dotenv
from pathlib import Path

class Database:
    def __init__(self):
        # Load .env file from python-backend directory
        env_path = Path(__file__).parent.parent / '.env'
        load_dotenv(env_path)
        
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not url or not key:
            print("Warning: Supabase credentials not found. Database features will be disabled.")
            self.supabase = None
            self.enabled = False
        else:
            try:
                self.supabase: Client = create_client(url, key)
                self.enabled = True
                print(f"Supabase connected: {url[:30]}...")
            except Exception as e:
                print(f"Warning: Failed to connect to Supabase: {str(e)}. Database features will be disabled.")
                self.supabase = None
                self.enabled = False
        
        self.cache_duration = timedelta(hours=4)  # 4時間のキャッシュ
    
    async def save_dishwashing_products(self, products: List[Dict[str, Any]]) -> None:
        """食器用洗剤の商品を保存"""
        if not self.enabled:
            return
            
        try:
            for product in products:
                # asinをキーにしてupsert
                self.supabase.table('dishwashing_liquid_products').upsert(
                    product,
                    on_conflict='asin'
                ).execute()
            
            print(f"Saved {len(products)} dishwashing products to database")
        except Exception as e:
            print(f"Error saving dishwashing products: {str(e)}")
    
    async def get_all_dishwashing_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """食器用洗剤の全商品を取得"""
        if not self.enabled:
            return []
            
        try:
            query = self.supabase.table('dishwashing_liquid_products').select('*')
            
            # フィルタリング
            if filter == 'refill':
                query = query.eq('is_refill', True)
            elif filter == 'regular':
                query = query.eq('is_refill', False)
            elif filter == 'sale':
                query = query.eq('on_sale', True)
            
            # 単価でソート
            query = query.order('price_per_1000ml', desc=False)
            
            response = query.execute()
            
            if response.data:
                return response.data
            return []
            
        except Exception as e:
            print(f"Error fetching dishwashing products: {str(e)}")
            return []
    
    async def get_all_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """全てのキャッシュ商品を取得（時間制限なし）"""
        if not self.enabled:
            return []
            
        try:
            # 全ての商品を取得（時間制限なし）
            query = self.supabase.table('toilet_paper_products').select('*')
            
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
    
    async def get_product_by_asin(self, asin: str) -> Optional[Dict[str, Any]]:
        """ASINで商品を取得"""
        if not self.enabled:
            return None
            
        try:
            response = self.supabase.table('toilet_paper_products').select('*').eq('asin', asin).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error fetching product by ASIN: {str(e)}")
            return None
    
    async def get_all_products(self) -> List[Dict[str, Any]]:
        """全商品を取得"""
        if not self.enabled:
            return []
            
        try:
            response = self.supabase.table('toilet_paper_products').select('*').execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching all products: {str(e)}")
            return []
    
    async def update_product_prices(self, updates: List[Dict[str, Any]]) -> None:
        """価格のみを更新"""
        if not self.enabled:
            return
            
        try:
            for update in updates:
                asin = update.pop('asin')
                # 価格関連フィールドのみ更新
                self.supabase.table('toilet_paper_products').update(update).eq('asin', asin).execute()
            
            print(f"Updated prices for {len(updates)} products")
        except Exception as e:
            print(f"Error updating prices: {str(e)}")
    
    async def save_price_history(self, product_data: Dict[str, Any]) -> None:
        """価格履歴を保存"""
        if not self.enabled:
            return
            
        try:
            history_data = {
                'asin': product_data.get('asin'),
                'price': product_data.get('price'),
                'price_per_m': product_data.get('price_per_m'),
                'price_per_roll': product_data.get('price_per_roll'),
                'roll_count': product_data.get('roll_count'),
                'length_m': product_data.get('length_m'),
                'total_length_m': product_data.get('total_length_m'),
                'on_sale': product_data.get('on_sale', False)
            }
            
            self.supabase.table('price_history').insert(history_data).execute()
        except Exception as e:
            print(f"Error saving price history: {str(e)}")
    
    async def upsert_products(self, products: List[Any]) -> None:
        """商品データを更新または挿入"""
        if not self.enabled:
            return
            
        try:
            # Pydanticモデルを辞書に変換し、フィールドを統一
            products_data = []
            
            # 全フィールドを定義（Supabaseのスキーマに合わせる）
            required_fields = {
                'asin': None,
                'title': '',
                'description': None,
                'brand': None,
                'image_url': None,
                'price': None,
                'price_regular': None,
                'discount_percent': None,
                'on_sale': False,
                'review_avg': None,
                'review_count': None,
                'roll_count': None,
                'length_m': None,
                'total_length_m': None,
                'price_per_roll': None,
                'price_per_m': None,
                'is_double': None
            }
            
            for product in products:
                product_dict = product.dict()
                
                # 全フィールドを統一（不足フィールドはデフォルト値を設定）
                standardized_dict = {}
                for field, default_value in required_fields.items():
                    if field in product_dict and product_dict[field] is not None:
                        standardized_dict[field] = product_dict[field]
                    elif default_value is not None:
                        standardized_dict[field] = default_value
                    # None値は除外（Supabaseでnullとして処理される）
                
                # 価格履歴を保存（別途保存）
                if standardized_dict.get('price_per_m'):
                    # 価格履歴テーブルに保存
                    await self.save_price_history(standardized_dict)
                
                # updated_atとcreated_atはSupabaseが自動設定するため、送信しない
                # idフィールドは自動生成なので削除
                if 'id' in standardized_dict:
                    del standardized_dict['id']
                if 'created_at' in standardized_dict:
                    del standardized_dict['created_at']
                if 'updated_at' in standardized_dict:
                    del standardized_dict['updated_at']
                products_data.append(standardized_dict)
            
            if not products_data:
                return
            
            # デバッグ: 最初のデータの構造を確認
            if products_data:
                print(f"Sample product data keys: {list(products_data[0].keys())}")
                print(f"Sample product data: {products_data[0]}")
            
            # 個別でupsert（コマンドライン版と同じ方式）
            success_count = 0
            error_count = 0
            
            for product_data in products_data:
                try:
                    response = self.supabase.table('toilet_paper_products').upsert(
                        product_data,
                        on_conflict='asin'
                    ).execute()
                    success_count += 1
                except Exception as e:
                    print(f"Error upserting individual product {product_data.get('asin', 'unknown')}: {str(e)}")
                    error_count += 1
            
            print(f"Upserted {success_count} products successfully, {error_count} errors")
            
        except Exception as e:
            print(f"Error upserting products: {str(e)}")
            # エラーの詳細を表示
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                print(f"Error details: {e.response.text}")