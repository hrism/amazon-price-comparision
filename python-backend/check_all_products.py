#!/usr/bin/env python3
"""
全商品をチェックして無関係な商品を特定
"""
import asyncio
from app.database import Database
import os
from dotenv import load_dotenv

load_dotenv()

async def check_all_products():
    db = Database()
    
    # 全商品を取得
    all_products = await db.get_all_products()
    print(f"総商品数: {len(all_products)}")
    
    # トイレ関連のキーワード
    toilet_keywords = [
        'トイレ', 'ペーパー', 'ティッシュ', 'ロール', 
        'シングル', 'ダブル', '芯なし', '再生紙',
        'スコッティ', 'エリエール', 'ネピア', 'クリネックス',
        'システィ', 'ソフト', 'プレミアム', 'コアレックス',
        'ワンタッチ', 'コンパクト', 'ペンギン', '大王製紙',
        'アイリス', 'Scottie', 'KIRKLAND', 'カークランド',
        '大分製紙', '丸富製紙', '春日', 'イットコ', 'クレシア',
        'by Amazon', 'ユニバーサル', '無印良品', 'サンリオ',
        '業務用', 'ケース販売', 'まとめ買い', '長持ち'
    ]
    
    suspicious_products = []
    
    for product in all_products:
        title = product.get('title', '')
        
        # トイレ関連キーワードが一つも含まれていない商品を特定
        if not any(keyword in title for keyword in toilet_keywords):
            suspicious_products.append(product)
    
    if suspicious_products:
        print(f"\n無関係と思われる商品: {len(suspicious_products)}件")
        print("=" * 80)
        for product in suspicious_products:
            print(f"ASIN: {product['asin']}")
            print(f"タイトル: {product['title']}")
            print(f"価格: ¥{product.get('price', 'N/A')}")
            print("-" * 80)
    else:
        print("\n無関係な商品は見つかりませんでした")
    
    return suspicious_products

if __name__ == "__main__":
    suspicious = asyncio.run(check_all_products())
    
    if suspicious:
        print(f"\n\n削除対象: {len(suspicious)}件")
        response = input("これらを削除しますか？ (yes/no): ")
        if response.lower() == 'yes':
            async def delete_all():
                db = Database()
                for product in suspicious:
                    await db.delete_product(product['asin'])
                    print(f"削除: {product['asin']} - {product['title'][:40]}...")
            asyncio.run(delete_all())
            print(f"\n{len(suspicious)}件削除完了")