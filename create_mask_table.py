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
-- マスク商品テーブル
CREATE TABLE IF NOT EXISTS mask_products (
  asin VARCHAR(20) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  image_url TEXT,
  price INTEGER,
  price_regular INTEGER,
  discount_percent NUMERIC(5,2),
  on_sale BOOLEAN DEFAULT false,
  review_avg NUMERIC(3,2),
  review_count INTEGER,
  mask_count INTEGER,
  price_per_mask NUMERIC(10,2),
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_mask_price_per_mask ON mask_products(price_per_mask);
CREATE INDEX IF NOT EXISTS idx_mask_on_sale ON mask_products(on_sale);
CREATE INDEX IF NOT EXISTS idx_mask_review_avg ON mask_products(review_avg);
CREATE INDEX IF NOT EXISTS idx_mask_last_fetched ON mask_products(last_fetched_at DESC);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_mask_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mask_updated_at
BEFORE UPDATE ON mask_products
FOR EACH ROW
EXECUTE FUNCTION update_mask_updated_at();
"""

try:
    # SQLを実行
    result = supabase.rpc('query', {'query_text': sql}).execute()
    print("Successfully created mask_products table")
except Exception as e:
    print(f"Error creating table: {e}")
    # テーブルが既に存在する場合も考慮
    try:
        # テーブルの存在確認
        result = supabase.table('mask_products').select('*').limit(1).execute()
        print("Table mask_products already exists")
    except:
        print("Failed to create or access mask_products table")