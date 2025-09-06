from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import time
import os

from app.scraper import AmazonScraper
from app.chatgpt_parser import ChatGPTParser
from app.database import Database
from .mask_size_cache import update_mask_size_cache, apply_mask_sizes

router = APIRouter()

scraper = AmazonScraper()
text_parser = ChatGPTParser()
db = Database()

async def search_mask_internal(
    keyword: str = "マスク",
    filter: Optional[str] = None,
    force: bool = False,
    scrape_token: Optional[str] = None
):
    """マスクの検索・スクレイピング処理（内部用）"""
    import time
    start_time = time.time()
    
    try:
        print(f"Mask search API called: keyword={keyword}, filter={filter}, force={force}")
        
        # 認証トークンのチェック（forceがTrueの場合）
        if force:
            expected_token = os.getenv('SCRAPE_AUTH_TOKEN')
            is_github_actions = os.getenv('GITHUB_ACTIONS') == 'true'
            
            # GitHub ActionsまたはSCRAPE_AUTH_TOKENが設定されている環境では認証を要求
            if is_github_actions or expected_token:
                if not expected_token:
                    raise HTTPException(status_code=500, detail="Server configuration error: SCRAPE_AUTH_TOKEN not set")
                
                if not scrape_token:
                    raise HTTPException(status_code=401, detail="Authentication required for force scraping")
                
                if scrape_token != expected_token:
                    raise HTTPException(status_code=403, detail="Invalid authentication token")
                
                print("Scraping authentication successful")
            else:
                print("Running in local development mode - authentication skipped")
        
        # force=Falseの場合、既存データを返す
        if not force:
            existing_products = await db.get_mask_products()
            if existing_products:
                print(f"Returning {len(existing_products)} cached mask products")
                # メモリキャッシュからmask_sizeを適用
                existing_products = apply_mask_sizes(existing_products)
                return {
                    "products": existing_products,
                    "count": len(existing_products),
                    "source": "cache"
                }
        
        # スクレイピング実行
        scrape_start = time.time()
        # マスクキーワードで検索
        products = await scraper.search_products(keyword)
        scrape_time = time.time() - scrape_start
        print(f"Scraped {len(products)} products in {scrape_time:.2f}s")
        
        # 既存のマスク商品情報を取得
        existing_mask_data = await db.get_mask_products()
        existing_mask_map = {item['asin']: item for item in existing_mask_data}
        
        # 処理済み商品リスト
        processed_products = []
        new_products_count = 0
        updated_products_count = 0
        
        for product in products:
            asin = product['asin']
            existing = existing_mask_map.get(asin)
            
            if existing and existing.get('mask_count') and existing.get('mask_size'):
                # 既存商品でmask_sizeもある場合は価格情報のみ更新
                updated_products_count += 1
                
                # 単価再計算
                price_per_mask = None
                if product.get('price') and existing['mask_count']:
                    price_per_mask = product['price'] / existing['mask_count']
                
                processed_product = {
                    'asin': asin,
                    'title': product.get('title', existing.get('title', '')),
                    'description': product.get('description', existing.get('description')),
                    'brand': product.get('brand', existing.get('brand')),
                    'image_url': product.get('image_url', existing.get('image_url')),
                    'price': product.get('price'),
                    'price_regular': product.get('price_regular') if product.get('price_regular') and product.get('price_regular') > 0 else None,
                    'discount_percent': product.get('discount_percent'),
                    'on_sale': product.get('on_sale', False),
                    'review_avg': product.get('review_avg'),
                    'review_count': product.get('review_count'),
                    'mask_count': existing['mask_count'],
                    'mask_size': existing.get('mask_size'),
                    'price_per_mask': price_per_mask
                }
                processed_products.append(processed_product)
                continue
            elif existing and existing.get('mask_count'):
                # 既存商品でmask_countはあるがmask_sizeがない場合、サイズのみ解析
                print(f"Existing product {asin} needs mask_size analysis...")
                
                # ChatGPTでサイズのみ解析
                extracted_info = await text_parser.extract_mask_info(
                    product.get('title', existing.get('title', '')), 
                    product.get('description', existing.get('description', ''))
                )
                
                # 単価再計算
                price_per_mask = None
                if product.get('price') and existing['mask_count']:
                    price_per_mask = product['price'] / existing['mask_count']
                
                processed_product = {
                    'asin': asin,
                    'title': product.get('title', existing.get('title', '')),
                    'description': product.get('description', existing.get('description')),
                    'brand': product.get('brand', existing.get('brand')),
                    'image_url': product.get('image_url', existing.get('image_url')),
                    'price': product.get('price'),
                    'price_regular': product.get('price_regular') if product.get('price_regular') and product.get('price_regular') > 0 else None,
                    'discount_percent': product.get('discount_percent'),
                    'on_sale': product.get('on_sale', False),
                    'review_avg': product.get('review_avg'),
                    'review_count': product.get('review_count'),
                    'mask_count': existing['mask_count'],
                    'mask_size': extracted_info.get('mask_size'),
                    'price_per_mask': price_per_mask
                }
                processed_products.append(processed_product)
                new_products_count += 1  # Count as analyzed
                continue
            
            # 新商品はChatGPTで解析
            new_products_count += 1
            print(f"New mask product detected: {asin}, analyzing with ChatGPT...")
            
            # ChatGPT解析
            extracted_info = await text_parser.extract_mask_info(
                product['title'], 
                product.get('description', '')
            )
            
            # mask_countがnullまたは0の場合はスキップ
            if not extracted_info.get('mask_count'):
                print(f"Skipping product with no mask count: {product.get('title', 'unknown')[:50]}")
                continue
            
            # 単価計算
            price_per_mask = None
            if product.get('price') and extracted_info.get('mask_count'):
                price_per_mask = product['price'] / extracted_info['mask_count']
            
            # 商品データ作成
            processed_product = {
                'asin': product['asin'],
                'title': product.get('title', ''),
                'description': product.get('description'),
                'brand': product.get('brand'),
                'image_url': product.get('image_url'),
                'price': product.get('price'),
                'price_regular': product.get('price_regular') if product.get('price_regular') and product.get('price_regular') > 0 else None,
                'discount_percent': product.get('discount_percent'),
                'on_sale': product.get('on_sale', False),
                'review_avg': product.get('review_avg'),
                'review_count': product.get('review_count'),
                'mask_count': extracted_info.get('mask_count'),
                'mask_size': extracted_info.get('mask_size'),
                'price_per_mask': price_per_mask
            }
            processed_products.append(processed_product)
        
        print(f"Mask processing summary:")
        print(f"  - New products (ChatGPT analyzed): {new_products_count}")
        print(f"  - Updated products (price only): {updated_products_count}")
        print(f"  - Total processed: {len(processed_products)}")
        
        # メモリキャッシュを更新
        update_mask_size_cache(processed_products)
        
        # データベースに保存
        await db.save_mask_products(processed_products)
        
        # フィルタリング
        if filter == 'large_pack':
            processed_products = [p for p in processed_products if p.get('mask_count', 0) >= 50]
        elif filter == 'small_pack':
            processed_products = [p for p in processed_products if p.get('mask_count', 0) < 50]
        elif filter == 'sale':
            processed_products = [p for p in processed_products if p.get('on_sale')]
        elif filter == 'size_large':
            processed_products = [p for p in processed_products if p.get('mask_size') == 'large']
        elif filter == 'size_slightly_large':
            processed_products = [p for p in processed_products if p.get('mask_size') == 'slightly_large']
        elif filter == 'size_regular':
            processed_products = [p for p in processed_products if p.get('mask_size') == 'regular']
        elif filter == 'size_slightly_small':
            processed_products = [p for p in processed_products if p.get('mask_size') == 'slightly_small']
        elif filter == 'size_small':
            processed_products = [p for p in processed_products if p.get('mask_size') == 'small']
        elif filter == 'size_kids':
            processed_products = [p for p in processed_products if p.get('mask_size') == 'kids']
        elif filter == 'size_unknown':
            processed_products = [p for p in processed_products if not p.get('mask_size')]
        
        # ソート（単価順）
        processed_products.sort(key=lambda p: p.get('price_per_mask') or float('inf'))
        
        total_time = time.time() - start_time
        print(f"Total processing time: {total_time:.2f}s")
        
        return {
            "products": processed_products,
            "count": len(processed_products),
            "source": "scraping" if force else "cache"
        }
        
    except Exception as e:
        import traceback
        print(f"Error in mask search: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/mask/search")
async def search_mask_products(
    keyword: str = Query(default="マスク"),
    filter: Optional[str] = Query(default=None),
    force: bool = Query(default=False),
    scrape_token: Optional[str] = Query(default=None)
):
    """マスクの検索APIエンドポイント"""
    result = await search_mask_internal(keyword, filter, force, scrape_token)
    return result["products"]  # APIエンドポイントとしてはproductsのみを返す