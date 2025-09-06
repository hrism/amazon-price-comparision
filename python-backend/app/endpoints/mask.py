from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict
import os
import time
import asyncio

router = APIRouter()

@router.get("/api/mask/filters")
async def get_available_filters() -> Dict:
    """利用可能なフィルターオプションを返す"""
    from app.database import Database
    db = Database()
    
    products = await db.get_mask_products()
    
    # 色の集計
    colors = {}
    sizes = {}
    
    for product in products:
        # 色
        color = product.get('mask_color')
        if color:
            colors[color] = colors.get(color, 0) + 1
        
        # サイズ
        size = product.get('mask_size')
        if size:
            sizes[size] = sizes.get(size, 0) + 1
    
    # ソートして返す
    return {
        "colors": [
            {"value": color, "count": count, "label": get_color_label(color)}
            for color, count in sorted(colors.items(), key=lambda x: x[1], reverse=True)
        ],
        "sizes": [
            {"value": size, "count": count, "label": get_size_label(size)}
            for size, count in sorted(sizes.items(), key=lambda x: x[1], reverse=True)
        ]
    }

def get_color_label(color: str) -> str:
    """色のラベルを返す"""
    labels = {
        'white': 'ホワイト',
        'black': 'ブラック',
        'gray': 'グレー',
        'pink': 'ピンク',
        'blue': 'ブルー',
        'beige': 'ベージュ',
        'purple': 'パープル',
        'green': 'グリーン',
        'yellow': 'イエロー',
        'multicolor': 'マルチカラー'
    }
    return labels.get(color, color)

def get_size_label(size: str) -> str:
    """サイズのラベルを返す"""
    labels = {
        'large': '大きめ',
        'slightly_large': 'やや大きめ',
        'regular': 'ふつう',
        'slightly_small': 'やや小さめ',
        'small': '小さめ',
        'kids': '子供用'
    }
    return labels.get(size, size)

@router.get("/api/mask/search")
async def search_mask(
    keyword: str = Query(default="マスク"),
    force: bool = Query(default=False),
    filter: Optional[str] = Query(default=None),
    scrape_token: Optional[str] = Query(default=None)
) -> Dict:
    """マスク商品の検索エンドポイント"""
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
            print(f"Starting mask scraping...")
            print(f"Scraping {keyword}...")
            
            # スクレイピング実行
            from app.scraper import AmazonScraper
            from app.chatgpt_parser import ChatGPTParser
            from app.database import Database
            
            scraper = AmazonScraper()
            text_parser = ChatGPTParser()
            db = Database()
            
            # マスクキーワードで検索
            products = await scraper.search_products(keyword)
            
            if not products:
                print("No products found during scraping")
                return {
                    "status": "success",
                    "count": 0,
                    "products": [],
                    "time": time.time() - start_time
                }
            
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
                
                if existing and existing.get('mask_count') and existing.get('mask_size') and existing.get('mask_color'):
                    # 既存商品で全データが揃っている場合は価格情報のみ更新
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
                        'mask_color': existing.get('mask_color'),
                        'price_per_mask': price_per_mask
                    }
                    processed_products.append(processed_product)
                    continue
                
                # 新商品または不完全な既存商品はChatGPTで解析
                new_products_count += 1
                print(f"Analyzing mask product: {asin}")
                
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
                    'mask_color': extracted_info.get('mask_color') or 'white',  # デフォルトは白
                    'price_per_mask': price_per_mask
                }
                processed_products.append(processed_product)
            
            print(f"Mask processing summary:")
            print(f"  - New/analyzed products: {new_products_count}")
            print(f"  - Updated products (price only): {updated_products_count}")
            print(f"  - Total processed: {len(processed_products)}")
            
            # データベースに保存
            await db.save_mask_products(processed_products)
            
            # フィルタリング適用
            if filter:
                processed_products = apply_filter(processed_products, filter)
            
            # ソート（単価順）
            processed_products.sort(key=lambda p: p.get('price_per_mask') or float('inf'))
            
            print(f"Mask scraping completed: {len(processed_products)} products in {time.time() - start_time:.2f}s")
            
            return {
                "status": "success",
                "count": len(processed_products),
                "products": processed_products,
                "from_cache": False,
                "time": round(time.time() - start_time, 2)
            }
        else:
            # force=falseの場合はデータベースから取得
            from app.database import Database
            db = Database()
            
            products = await db.get_mask_products()
            
            # フィルタリング適用
            if filter:
                products = apply_filter(products, filter)
            
            # ソート（単価順）
            products.sort(key=lambda p: p.get('price_per_mask') or float('inf'))
            
            result = {
                "status": "success",
                "count": len(products),
                "products": products,
                "from_cache": True,
                "time": round(time.time() - start_time, 2)
            }
            print(f"[DEBUG] Returning mask search result: type={type(result)}, is_array={isinstance(result, list)}, count={result.get('count', 'N/A')}")
            print(f"[DEBUG] FORCE VERIFICATION - Response is object: {result}")
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] mask search failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def apply_filter(products: List[Dict], filter: str) -> List[Dict]:
    """フィルターを適用"""
    if not filter:
        return products
    
    if filter == 'large_pack':
        return [p for p in products if p.get('mask_count', 0) >= 50]
    elif filter == 'small_pack':
        return [p for p in products if p.get('mask_count', 0) < 50]
    elif filter == 'sale':
        return [p for p in products if p.get('on_sale')]
    elif filter == 'size_large':
        return [p for p in products if p.get('mask_size') == 'large']
    elif filter == 'size_slightly_large':
        return [p for p in products if p.get('mask_size') == 'slightly_large']
    elif filter == 'size_regular':
        return [p for p in products if p.get('mask_size') == 'regular']
    elif filter == 'size_slightly_small':
        return [p for p in products if p.get('mask_size') == 'slightly_small']
    elif filter == 'size_small':
        return [p for p in products if p.get('mask_size') == 'small']
    elif filter == 'size_kids':
        return [p for p in products if p.get('mask_size') == 'kids']
    elif filter == 'size_unknown':
        return [p for p in products if not p.get('mask_size')]
    elif filter == 'color_white':
        return [p for p in products if p.get('mask_color') == 'white']
    elif filter == 'color_black':
        return [p for p in products if p.get('mask_color') == 'black']
    elif filter == 'color_gray':
        return [p for p in products if p.get('mask_color') == 'gray']
    elif filter == 'color_pink':
        return [p for p in products if p.get('mask_color') == 'pink']
    elif filter == 'color_blue':
        return [p for p in products if p.get('mask_color') == 'blue']
    elif filter == 'color_beige':
        return [p for p in products if p.get('mask_color') == 'beige']
    elif filter == 'color_purple':
        return [p for p in products if p.get('mask_color') == 'purple']
    elif filter == 'color_green':
        return [p for p in products if p.get('mask_color') == 'green']
    elif filter == 'color_yellow':
        return [p for p in products if p.get('mask_color') == 'yellow']
    elif filter == 'color_multicolor':
        return [p for p in products if p.get('mask_color') == 'multicolor']
    
    return products