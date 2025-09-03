#!/usr/bin/env python3
"""
特定の米商品を売り切れとしてマークするスクリプト
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# .envファイルから環境変数を読み込む
load_dotenv()

# Supabaseクライアントの初期化
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in environment variables")
    exit(1)

supabase: Client = create_client(url, key)

# 売り切れ商品のASINリスト（単価が異常に高い商品）
out_of_stock_asins = [
    "B0D6F2BK6N",  # 味の素 業務用 お米ふっくら調理料 1kg - 単価4316円
]

try:
    for asin in out_of_stock_asins:
        # 商品を売り切れとしてマーク
        result = supabase.table("rice_products").update({
            "out_of_stock": True
        }).eq("asin", asin).execute()
        
        if result.data:
            print(f"Marked as out of stock: ASIN={asin}")
        else:
            print(f"Product not found: ASIN={asin}")
    
    # 売り切れ商品の確認
    out_of_stock_products = supabase.table("rice_products").select("asin, title, price_per_kg").eq("out_of_stock", True).execute()
    
    if out_of_stock_products.data:
        print(f"\nTotal out-of-stock products: {len(out_of_stock_products.data)}")
        for product in out_of_stock_products.data:
            print(f"  - {product['asin']}: {product['title'][:50]}... (¥{product['price_per_kg']}/kg)")
    else:
        print("\nNo out-of-stock products found")
        
except Exception as e:
    print(f"Error: {e}")