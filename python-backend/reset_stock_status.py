#!/usr/bin/env python3
"""
全ての米商品のout_of_stockをfalseにリセットするスクリプト
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

try:
    # 全ての米商品のout_of_stockをfalseにリセット
    result = supabase.table("rice_products").update({
        "out_of_stock": False
    }).neq("asin", "").execute()
    
    if result.data:
        print(f"Reset out_of_stock status for {len(result.data)} products")
    else:
        print("No products were updated")
        
except Exception as e:
    print(f"Error: {e}")