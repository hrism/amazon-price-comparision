import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase設定
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase credentials not found")
    exit(1)

# Supabaseクライアント作成
supabase: Client = create_client(url, key)

# データ削除
try:
    response = supabase.table('toilet_paper_products').delete().neq('asin', '').execute()
    print(f"Deleted all records from toilet_paper_products")
    
    # カウント確認
    count_response = supabase.table('toilet_paper_products').select('*', count='exact').execute()
    print(f"Current record count: {count_response.count if hasattr(count_response, 'count') else len(count_response.data)}")
    
except Exception as e:
    print(f"Error: {str(e)}")