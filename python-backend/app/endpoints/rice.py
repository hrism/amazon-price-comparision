from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict
import os
import time
from app.scrapers.rice_scraper import scrape_rice, save_rice_to_db
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabaseクライアントの初期化
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

router = APIRouter()

@router.get("/api/rice/search")
async def search_rice(
    keyword: str = Query(default="米"),
    force: bool = Query(default=False),
    scrape_token: Optional[str] = Query(default=None)
) -> Dict:
    """米商品の検索エンドポイント"""
    start_time = time.time()
    
    try:
        # force=trueの場合はトークン検証（ローカル環境はスキップ）
        if force:
            # GitHub Actions環境またはトークンが設定されている場合のみチェック
            if os.getenv('GITHUB_ACTIONS') == 'true' or os.getenv('SCRAPE_AUTH_TOKEN'):
                expected_token = os.getenv('SCRAPE_AUTH_TOKEN')
                if not expected_token or scrape_token != expected_token:
                    raise HTTPException(status_code=403, detail="Invalid scrape token")
            else:
                print("Local environment detected - skipping token validation")
        
        # force=falseの場合は既存データを返す
        if not force:
            try:
                # out_of_stock=falseの商品のみ取得（在庫切れ商品を除外）
                result = supabase.table("rice_products").select("*").eq("out_of_stock", False).execute()
                if result.data:
                    # 最新の更新時刻を取得
                    latest_update = max((p.get('last_fetched_at', '') for p in result.data), default='')
                    return {
                        "products": result.data,
                        "lastUpdate": latest_update,
                        "source": "database",
                        "count": len(result.data),
                        "time": time.time() - start_time
                    }
            except Exception as e:
                print(f"Database fetch error: {e}")
        
        # force=trueの場合のみスクレイピング実行
        print(f"Starting rice scraping...")
        print(f"Scraping {keyword}...")
        
        # スクレイピング実行
        products = await scrape_rice(keyword)
        
        if not products:
            print("No products found during scraping")
            return {
                "status": "success",
                "count": 0,
                "products": [],
                "time": time.time() - start_time,
                "source": "scraping"
            }
        
        # 総合スコアを計算
        from app.utils.score_calculator import calculate_all_scores
        products_with_scores = calculate_all_scores(products, 'price_per_kg')
        
        # DBに保存
        save_result = await save_rice_to_db(products_with_scores)
        print(f"Save result: {save_result}")
        
        return {
            "status": "success",
            "products": products_with_scores,
            "lastUpdate": products_with_scores[0].get('last_fetched_at') if products_with_scores else None,
            "count": len(products_with_scores),
            "time": time.time() - start_time,
            "source": "scraping"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in rice scraping: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))