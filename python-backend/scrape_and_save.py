#!/usr/bin/env python3
"""
コマンドライン用スクレイピングスクリプト
UIを経由せずに直接DBに商品データを保存する
"""
import asyncio
import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

# パスを追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.scraper import AmazonScraper
from app.chatgpt_parser import ChatGPTParser
from supabase import create_client, Client

load_dotenv()

async def main():
    print("=== 商品スクレイピング開始 ===")
    
    # 環境変数チェック
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    openai_key = os.getenv('OPENAI_API_KEY')
    
    if not url or not key:
        print("❌ Supabase認証情報が見つかりません")
        return
    
    if not openai_key:
        print("❌ OpenAI API Keyが見つかりません")
        return
    
    # Supabase接続
    supabase = create_client(url, key)
    print("✅ Supabase接続完了")
    
    # スクレイピング開始
    scraper = AmazonScraper()
    parser = ChatGPTParser()
    
    try:
        # 1. Amazonから商品を取得
        print("\n📦 Amazonから商品データを取得中...")
        products = await scraper.search_products("トイレットペーパー")
        print(f"✅ {len(products)}件の商品を取得")
        
        # 2. 各商品を解析
        print("\n🤖 ChatGPTで商品情報を解析中...")
        processed_products = []
        
        for i, product in enumerate(products, 1):
            if not product.get('title'):
                continue
            
            print(f"  {i}/{len(products)}: {product['title'][:50]}...")
            
            # ChatGPTで解析
            extracted_info = await parser.extract_info(
                product['title'],
                product.get('description', '')
            )
            
            # 単価計算
            price_per_roll = None
            price_per_m = None
            
            if product.get('price') and extracted_info.get('roll_count'):
                price_per_roll = product['price'] / extracted_info['roll_count']
            
            if product.get('price') and extracted_info.get('total_length_m'):
                price_per_m = product['price'] / extracted_info['total_length_m']
            
            # データ構築
            product_data = {
                'asin': product['asin'],
                'title': product.get('title', ''),
                'description': product.get('description'),
                'brand': product.get('brand'),
                'image_url': product.get('image_url'),
                'price': product.get('price'),
                'price_regular': product.get('price_regular'),
                'discount_percent': product.get('discount_percent'),
                'on_sale': product.get('on_sale', False),
                'review_avg': product.get('review_avg'),
                'review_count': product.get('review_count'),
                'roll_count': extracted_info.get('roll_count'),
                'length_m': extracted_info.get('length_m'),
                'total_length_m': extracted_info.get('total_length_m'),
                'price_per_roll': price_per_roll,
                'price_per_m': price_per_m,
                'is_double': extracted_info.get('is_double')
            }
            
            # None値を除去
            product_data = {k: v for k, v in product_data.items() if v is not None}
            processed_products.append(product_data)
        
        print(f"✅ {len(processed_products)}件の商品を解析完了")
        
        # 3. DBに保存（一件ずつ）
        print("\n💾 データベースに保存中...")
        success_count = 0
        error_count = 0
        
        for i, product_data in enumerate(processed_products, 1):
            try:
                response = supabase.table('toilet_paper_products').upsert(
                    product_data, on_conflict='asin'
                ).execute()
                
                print(f"  ✅ {i}/{len(processed_products)}: {product_data['asin']} - {product_data['title'][:30]}...")
                success_count += 1
                
            except Exception as e:
                print(f"  ❌ {i}/{len(processed_products)}: {product_data['asin']} - エラー: {str(e)}")
                error_count += 1
        
        # 4. 結果確認
        print(f"\n=== 結果 ===")
        print(f"✅ 成功: {success_count}件")
        print(f"❌ エラー: {error_count}件")
        
        # DBの件数確認
        db_response = supabase.table('toilet_paper_products').select('*', count='exact').execute()
        print(f"📊 DB内商品数: {len(db_response.data)}件")
        
        if db_response.data:
            # 最安値を表示
            cheapest = min(db_response.data, key=lambda x: x.get('price_per_m') or float('inf'))
            if cheapest.get('price_per_m'):
                print(f"🏆 最安値: {cheapest['title'][:50]} - ¥{cheapest['price_per_m']:.2f}/m")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {str(e)}")
    finally:
        await scraper.close()
        await parser.close()
    
    print("\n=== 完了 ===")

if __name__ == "__main__":
    asyncio.run(main())