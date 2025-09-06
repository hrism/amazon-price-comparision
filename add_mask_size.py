#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def add_mask_size_column():
    # Connect to Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Test query to check current structure
    try:
        result = supabase.table('mask_products').select('asin,mask_count').limit(1).execute()
        print(f"Current mask_products table has {len(result.data)} test row(s)")
        
        # Try to select mask_size to see if it exists
        try:
            result = supabase.table('mask_products').select('asin,mask_size').limit(1).execute()
            print("mask_size column already exists!")
            return True
        except Exception as e:
            print(f"mask_size column doesn't exist yet: {e}")
            print("You need to manually add the column via Supabase dashboard:")
            print("1. Go to your Supabase dashboard")
            print("2. Navigate to Table Editor > mask_products")
            print("3. Click 'Add column'")
            print("4. Name: mask_size, Type: text, Default: NULL")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    add_mask_size_column()