from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict
import os
import time
import asyncio
from app.scrapers.mineral_water_scraper import scrape_mineral_water, save_mineral_water_to_db

router = APIRouter()

@router.get("/api/mineral-water/search")
async def search_mineral_water(
    keyword: str = Query(default="ミネラルウォーター"),
    force: bool = Query(default=False),
    scrape_token: Optional[str] = Query(default=None)
) -> Dict:
    """ミネラルウォーター商品の検索エンドポイント"""
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
        
        # force=trueの場合のみスクレイピング実行
        if force:
            print(f"Starting mineral_water scraping...")
            print(f"Scraping {keyword}...")
            
            # スクレイピング実行
            products = await scrape_mineral_water(keyword)
            
            if not products:
                print("No products found during scraping")
                return {
                    "status": "success",
                    "count": 0,
                    "products": [],
                    "time": time.time() - start_time
                }
            
            # データベースに保存
            save_result = save_mineral_water_to_db(products)
            
            print(f"mineral_water scraping completed: {len(products)} products in {time.time() - start_time:.2f}s")
            
            return {
                "status": "success",
                "count": len(products),
                "products": products,
                "database": save_result,
                "time": round(time.time() - start_time, 2)
            }
        else:
            # force=falseの場合はデータベースから取得
            from app.db.supabase import supabase_client
            
            result = supabase_client.table('mineral_water_products').select('*').execute()
            products = result.data if result.data else []
            
            return {
                "status": "success",
                "count": len(products),
                "products": products,
                "from_cache": True,
                "time": round(time.time() - start_time, 2)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] mineral_water search failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))