"""
米商品用のSupabaseテーブルを作成するスクリプト
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabaseクライアントの初期化
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
)

# SQLクエリを実行してテーブルを作成
create_table_query = """
CREATE TABLE IF NOT EXISTS public.rice_products (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(255) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    brand VARCHAR(255),
    price NUMERIC(10, 2),
    price_regular NUMERIC(10, 2),
    price_fresh NUMERIC(10, 2),
    price_fresh_regular NUMERIC(10, 2),
    is_fresh_available BOOLEAN DEFAULT FALSE,
    review_avg NUMERIC(3, 2),
    review_count INTEGER,
    image_url TEXT,
    description TEXT,
    weight_kg NUMERIC(10, 2),
    price_per_kg NUMERIC(10, 2),
    price_per_kg_fresh NUMERIC(10, 2),
    rice_type VARCHAR(255),
    is_musenmai BOOLEAN DEFAULT FALSE,
    discount_percent NUMERIC(5, 2),
    discount_percent_fresh NUMERIC(5, 2),
    on_sale BOOLEAN DEFAULT FALSE,
    total_score NUMERIC(5, 2),
    last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

# インデックスの作成
create_indexes = """
CREATE INDEX IF NOT EXISTS idx_rice_products_asin ON public.rice_products(asin);
CREATE INDEX IF NOT EXISTS idx_rice_products_price_per_kg ON public.rice_products(price_per_kg);
CREATE INDEX IF NOT EXISTS idx_rice_products_price_per_kg_fresh ON public.rice_products(price_per_kg_fresh);
CREATE INDEX IF NOT EXISTS idx_rice_products_last_fetched ON public.rice_products(last_fetched_at DESC);
"""

# RLSポリシーの作成
create_policies = """
ALTER TABLE public.rice_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.rice_products
    FOR SELECT
    USING (true);
"""

try:
    # テーブルの作成
    print("Creating rice_products table...")
    result = supabase.rpc('exec_sql', {'sql': create_table_query}).execute()
    print("Table created successfully")
    
    # インデックスの作成
    print("Creating indexes...")
    result = supabase.rpc('exec_sql', {'sql': create_indexes}).execute()
    print("Indexes created successfully")
    
    # ポリシーの作成
    print("Creating RLS policies...")
    result = supabase.rpc('exec_sql', {'sql': create_policies}).execute()
    print("Policies created successfully")
    
    print("\n✅ Rice products table setup completed successfully!")
    
except Exception as e:
    print(f"❌ Error creating table: {e}")
    print("\nTrying alternative approach...")
    
    # 別の方法でテストデータを挿入
    try:
        test_data = {
            'asin': 'TEST001',
            'title': 'テスト米商品',
            'brand': 'テストブランド',
            'price': 3000,
            'weight_kg': 5,
            'price_per_kg': 600
        }
        
        result = supabase.table('rice_products').insert(test_data).execute()
        print("✅ Test data inserted successfully - table exists!")
        
        # テストデータを削除
        supabase.table('rice_products').delete().eq('asin', 'TEST001').execute()
        print("✅ Test data removed")
        
    except Exception as e2:
        print(f"Table might not exist. Error: {e2}")
        print("\n⚠️ Please create the table manually in Supabase dashboard using the following SQL:")
        print(create_table_query)