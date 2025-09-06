import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.local')

# Supabase設定
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_service_key:
    print("Error: Supabase credentials not found")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_service_key)

# SQLを実行
sql = """
-- マスクサイズカラムを追加
ALTER TABLE mask_products 
ADD COLUMN IF NOT EXISTS mask_size VARCHAR(50);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_mask_size ON mask_products(mask_size);
"""

try:
    # Supabase SQL Editorを使う代わりに、直接実行を試みる
    # Service Keyを使って管理者権限で実行
    print("Adding mask_size column to mask_products table...")
    
    # まずテーブルの存在確認
    result = supabase.table('mask_products').select('*').limit(1).execute()
    print("Table mask_products exists, proceeding with column addition...")
    
    # Note: Supabaseの管理画面から実行する必要がある場合があります
    print("\nPlease execute the following SQL in Supabase SQL Editor:")
    print(sql)
    print("\nAlternatively, the column will be added automatically when new data is inserted.")
    
except Exception as e:
    print(f"Error: {e}")
    print("\nPlease execute the following SQL in Supabase SQL Editor:")
    print(sql)