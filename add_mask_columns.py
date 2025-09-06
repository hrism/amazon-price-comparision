import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.local')

# Supabase設定
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# SQLを実行
sql = """
-- mask_sizeとmask_colorカラムを追加
ALTER TABLE mask_products ADD COLUMN IF NOT EXISTS mask_size TEXT;
ALTER TABLE mask_products ADD COLUMN IF NOT EXISTS mask_color TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_mask_size ON mask_products(mask_size);
CREATE INDEX IF NOT EXISTS idx_mask_color ON mask_products(mask_color);
"""

try:
    # SQLを実行
    result = supabase.rpc('query', {'query_text': sql}).execute()
    print("Successfully added mask_size and mask_color columns")
    
    # テーブル構造確認
    result = supabase.table('mask_products').select('*').limit(1).execute()
    if result.data:
        columns = list(result.data[0].keys())
        print(f"Current columns: {columns}")
        if 'mask_size' in columns and 'mask_color' in columns:
            print("✅ mask_size and mask_color columns are present")
        else:
            print("❌ mask_size or mask_color columns are missing")
    else:
        print("Table is empty, cannot verify columns")
        
except Exception as e:
    print(f"Error adding columns: {e}")