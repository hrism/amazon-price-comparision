#!/usr/bin/env python3
"""
テスト関連の無関係な商品をデータベースから削除するスクリプト
"""
import asyncio
from app.database import Database
import os
from dotenv import load_dotenv

load_dotenv()

async def delete_test_products():
    db = Database()
    
    # まず全商品を取得
    all_products = await db.get_all_products()
    print(f"総商品数: {len(all_products)}")
    
    # 削除対象の商品をフィルタリング
    test_keywords = [
        'テスト', 'TEST', 'test', '単体テスト', 'ソフトウェアテスト',
        'グレイテスト', '共通テスト', '入学試験', 'バカとテスト',
        'プログラミング', 'ソフトウェア', '書籍', 'DVD', '映画',
        'ラグビー', 'クリケット', 'テストフェン', 'サプリメント',
        '受験', '問題集', '参考書', 'アルゴリズム', 'データ構造',
        '開発者', 'エンジニア', 'Copilot', 'Python', 'Web API',
        '探索的', '技法', 'テスター', 'E2E', 'Playwright',
        'JSTQB', 'A/Bテスト', 'テストプロセス', '高品質',
        'ゲームをテスト', 'テスティング', 'はじめて学ぶ',
        'マンガでわかる', 'どんくり', '駆動', 'テクニック',
        '教科書', 'セオリー', '考え方', '使い方', '指南書',
        '入門', '実践', 'ガイド', '練習帳', '技法',
        'フロントエンド', 'バックエンド', 'デート', 'Kindle',
        '字幕版', '吹替版', 'TV番組', 'プレイ', 'ショー'
    ]
    
    # トイレ関連のキーワード（削除しない）
    toilet_keywords = [
        'トイレ', 'ペーパー', 'ティッシュ', 'ロール', 'シングル', 
        'ダブル', '芯なし', '再生紙', 'ソフト', 'プレミアム'
    ]
    
    products_to_delete = []
    
    for product in all_products:
        title = product.get('title', '')
        
        # トイレ関連商品は削除しない
        if any(keyword in title for keyword in toilet_keywords):
            continue
        
        # テスト関連キーワードが含まれている商品を削除対象にする
        if any(keyword in title for keyword in test_keywords):
            products_to_delete.append(product)
            print(f"削除対象: {product['asin']} - {title[:50]}...")
    
    print(f"\n削除対象商品数: {len(products_to_delete)}")
    
    if products_to_delete:
        # 確認
        response = input("これらの商品を削除しますか？ (yes/no): ")
        if response.lower() == 'yes':
            for product in products_to_delete:
                await db.delete_product(product['asin'])
                print(f"削除: {product['asin']}")
            print(f"\n{len(products_to_delete)}件の商品を削除しました")
        else:
            print("削除をキャンセルしました")
    else:
        print("削除対象の商品はありません")
    
    # 削除後の商品数を確認
    remaining_products = await db.get_all_products()
    print(f"\n残り商品数: {len(remaining_products)}")

if __name__ == "__main__":
    asyncio.run(delete_test_products())