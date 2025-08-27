#!/usr/bin/env python3
"""
本番環境のSupabaseを直接チェック
"""
import os
from supabase import create_client
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def check_production():
    # 本番環境のSupabase認証情報
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    print(f"Connecting to production Supabase: {url[:30]}...")
    supabase = create_client(url, key)
    
    # 全商品を取得
    response = supabase.table('toilet_paper_products').select("*").execute()
    all_products = response.data
    
    print(f"本番環境の総商品数: {len(all_products)}")
    
    # 無関係キーワード - さらに拡張
    bad_keywords = [
        'プログラミング', 'コンテスト', 'アルゴリズム', 'データ構造',
        'どんくり', '共通テスト', 'ソフトウェアテスト', '徹底指南',
        'テスト', 'TEST', '単体テスト', '教科書', '入門',
        '技法', '実践', 'ガイド', '練習帳', 'フロントエンド',
        'バックエンド', 'Python', 'Web API', 'Copilot',
        '書籍', 'DVD', '映画', '字幕版', '吹替版',
        'グレイテスト', 'ショー', 'バカとテスト', '受験',
        '問題集', '参考書', 'エンジニア', '開発者'
    ]
    
    # トイレ関連キーワード - これが含まれていない商品も確認
    toilet_keywords = [
        'トイレ', 'ペーパー', 'ティッシュ', 'ロール', 
        'シングル', 'ダブル', '芯', '再生紙',
        'スコッティ', 'エリエール', 'ネピア', 'クリネックス',
        'システィ', 'ソフト', 'プレミアム', 'コアレックス',
        'ワンタッチ', 'コンパクト', 'ペンギン', '大王製紙',
        'アイリス', 'Scottie', 'KIRKLAND', 'カークランド',
        '大分製紙', '丸富製紙', '春日', 'イットコ', 'クレシア',
        'by Amazon', 'ユニバーサル', '無印良品', 'サンリオ',
        '業務用', 'ケース販売', 'まとめ買い', '長持ち', '巻',
        '大容量', 'パック', '枚', 'm', '備蓄'
    ]
    
    suspicious = []
    for product in all_products:
        title = product.get('title', '')
        # 無関係キーワードが含まれるか、トイレ関連キーワードが一つも含まれない
        if any(keyword in title for keyword in bad_keywords) or \
           not any(keyword in title for keyword in toilet_keywords):
            suspicious.append(product)
    
    if suspicious:
        print(f"\n本番環境の無関係商品: {len(suspicious)}件")
        print("=" * 80)
        for product in suspicious:
            print(f"ASIN: {product['asin']}")
            print(f"タイトル: {product['title']}")
            print(f"価格: ¥{product.get('price', 'N/A')}")
            print("-" * 80)
        
        # ASINリストを出力
        print("\n削除用ASINリスト:")
        asins = [p['asin'] for p in suspicious]
        print(asins)
        
        return suspicious, asins
    else:
        print("\n本番環境に無関係商品はありません")
        return [], []

async def delete_from_production(asins):
    """本番環境から削除"""
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    supabase = create_client(url, key)
    
    for asin in asins:
        try:
            response = supabase.table('toilet_paper_products').delete().eq('asin', asin).execute()
            print(f"削除成功: {asin}")
        except Exception as e:
            print(f"削除失敗 {asin}: {str(e)}")

if __name__ == "__main__":
    suspicious, asins = asyncio.run(check_production())
    
    if asins:
        print(f"\n削除対象: {len(asins)}件")
        response = input("本番環境から削除しますか？ (yes/no): ")
        if response.lower() == 'yes':
            asyncio.run(delete_from_production(asins))
            print(f"\n{len(asins)}件削除完了")