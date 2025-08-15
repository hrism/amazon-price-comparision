"""
定期的に価格を更新するスクリプト
AWS Lambda または cron で実行される
"""
import asyncio
import os
from datetime import datetime
from typing import Dict, Any, List
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scraper import AmazonScraper
from app.chatgpt_parser import ChatGPTParser
from app.database import Database
from dotenv import load_dotenv

load_dotenv()

async def update_product_prices():
    """価格のみを更新する処理"""
    db = Database()
    scraper = AmazonScraper()
    
    try:
        print(f"価格更新開始: {datetime.now()}")
        
        # 現在のDBから全商品のASINを取得
        existing_products = await db.get_all_products()
        
        if not existing_products:
            print("DBに商品がありません。初回スクレイピングを実行します。")
            return await initial_scraping()
        
        print(f"更新対象: {len(existing_products)}件の商品")
        
        # 各商品の最新価格を取得
        updated_products = []
        for product in existing_products:
            try:
                # 詳細ページから価格を取得
                detail = await scraper.get_product_detail(product['asin'])
                
                if detail and detail.get('price'):
                    # 価格関連フィールドのみ更新
                    update_data = {
                        'asin': product['asin'],
                        'price': detail.get('price'),
                        'price_regular': detail.get('price_regular'),
                        'on_sale': detail.get('on_sale', False),
                        'review_avg': detail.get('review_avg'),
                        'review_count': detail.get('review_count'),
                    }
                    
                    # 単価を再計算
                    if update_data['price'] and product.get('roll_count'):
                        update_data['price_per_roll'] = update_data['price'] / product['roll_count']
                    
                    if update_data['price'] and product.get('total_length_m'):
                        update_data['price_per_m'] = update_data['price'] / product['total_length_m']
                    
                    updated_products.append(update_data)
                    print(f"更新: {product['asin']} - ¥{update_data['price']}")
                else:
                    print(f"価格取得失敗: {product['asin']}")
                    
            except Exception as e:
                print(f"エラー {product['asin']}: {str(e)}")
                continue
        
        # DBを更新
        if updated_products:
            await db.update_product_prices(updated_products)
            print(f"更新完了: {len(updated_products)}件の価格を更新")
        
        await scraper.close()
        return {"updated": len(updated_products), "timestamp": datetime.now().isoformat()}
        
    except Exception as e:
        print(f"更新エラー: {str(e)}")
        await scraper.close()
        raise

async def initial_scraping():
    """初回の全商品スクレイピング"""
    scraper = AmazonScraper()
    parser = ChatGPTParser()
    db = Database()
    
    try:
        print("初回スクレイピング開始")
        
        # Amazon検索
        products = await scraper.search_products("トイレットペーパー")
        print(f"取得: {len(products)}件の商品")
        
        # 各商品を解析
        processed = []
        for product in products:
            if not product.get('title'):
                continue
                
            # ChatGPTで解析
            info = await parser.extract_info(
                product['title'],
                product.get('description', '')
            )
            
            # データ結合
            product_data = {
                **product,
                **info
            }
            
            # 単価計算
            if product_data.get('price') and product_data.get('roll_count'):
                product_data['price_per_roll'] = product_data['price'] / product_data['roll_count']
            
            if product_data.get('price') and product_data.get('total_length_m'):
                product_data['price_per_m'] = product_data['price'] / product_data['total_length_m']
            
            processed.append(product_data)
        
        # DBに保存
        await db.upsert_products(processed)
        print(f"初回登録完了: {len(processed)}件")
        
        await scraper.close()
        await parser.close()
        
        return {"initialized": len(processed), "timestamp": datetime.now().isoformat()}
        
    except Exception as e:
        print(f"初回スクレイピングエラー: {str(e)}")
        await scraper.close()
        await parser.close()
        raise

def lambda_handler(event, context):
    """AWS Lambda エントリーポイント"""
    result = asyncio.run(update_product_prices())
    return {
        'statusCode': 200,
        'body': result
    }

if __name__ == "__main__":
    # ローカルテスト用
    result = asyncio.run(update_product_prices())
    print(f"結果: {result}")