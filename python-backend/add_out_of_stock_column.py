#!/usr/bin/env python3
"""
rice_productsテーブルにout_of_stockカラムを追加するスクリプト
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

# SQLクエリを実行してカラムを追加
try:
    # まずカラムが存在するか確認
    result = supabase.rpc('exec_sql', {
        'query': """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rice_products' 
        AND column_name = 'out_of_stock';
        """
    }).execute()
    
    if result.data and len(result.data) > 0:
        print("Column 'out_of_stock' already exists in rice_products table")
    else:
        # カラムを追加
        add_column_query = """
        ALTER TABLE rice_products 
        ADD COLUMN IF NOT EXISTS out_of_stock BOOLEAN DEFAULT FALSE;
        """
        
        # Supabaseのダッシュボードから実行する必要がある
        print("Please run the following SQL in Supabase SQL Editor:")
        print(add_column_query)
        print("\nAlternatively, you can add the column through Supabase Table Editor:")
        print("1. Go to Supabase Dashboard > Table Editor")
        print("2. Select 'rice_products' table")
        print("3. Click 'Add column'")
        print("4. Name: out_of_stock")
        print("5. Type: boolean")
        print("6. Default value: false")
        
except Exception as e:
    print(f"Error: {e}")
    print("\nPlease add the column manually through Supabase Dashboard")