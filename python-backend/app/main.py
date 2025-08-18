from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import secrets
from dotenv import load_dotenv

from .scraper import AmazonScraper
from .chatgpt_parser import ChatGPTParser
from .database import Database
from .price_validator import PriceValidator

load_dotenv()

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初期化
scraper = AmazonScraper()
text_parser = ChatGPTParser()
db = Database()
price_validator = PriceValidator()

class Product(BaseModel):
    asin: str
    title: str
    description: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[int] = None
    price_regular: Optional[int] = None
    discount_percent: Optional[int] = None
    on_sale: bool = False
    review_avg: Optional[float] = None
    review_count: Optional[int] = None
    roll_count: Optional[int] = None
    length_m: Optional[float] = None
    total_length_m: Optional[float] = None
    price_per_roll: Optional[float] = None
    price_per_m: Optional[float] = None
    is_double: Optional[bool] = None

@app.get("/")
async def root():
    return {"message": "Toilet Paper Price Compare API"}

@app.get("/api/scrape-all")
async def scrape_all_products(
    scrape_token: Optional[str] = None
):
    """全商品タイプを一括でスクレイピングする統合エンドポイント"""
    import time
    from .scrapers.registry import get_all_product_types, get_scraper
    
    start_time = time.time()
    
    try:
        # トークン検証（ローカル環境はスキップ）
        if os.getenv('GITHUB_ACTIONS') == 'true' or os.getenv('SCRAPE_AUTH_TOKEN'):
            expected_token = os.getenv('SCRAPE_AUTH_TOKEN')
            if not expected_token:
                expected_token = secrets.token_urlsafe(32)
                print(f"Warning: SCRAPE_AUTH_TOKEN not set. Generated token: {expected_token}")
            
            if scrape_token != expected_token:
                raise HTTPException(status_code=403, detail="Invalid scrape token")
        else:
            print("Local environment detected - skipping token validation")
        
        # 全商品タイプを取得
        product_types = get_all_product_types()
        results = {}
        
        # 各商品タイプごとにスクレイピング
        for product_type in product_types:
            try:
                type_start = time.time()
                print(f"Starting {product_type} scraping...")
                
                # 対応するスクレイパーを取得
                scraper_instance = get_scraper(product_type, scraper, text_parser, db)
                
                # スクレイピング実行
                result = await scraper_instance.scrape(force=True)
                
                type_time = time.time() - type_start
                results[product_type] = {
                    "status": "success",
                    "count": result["count"],
                    "new": result.get("new", 0),
                    "updated": result.get("updated", 0),
                    "time": round(type_time, 2)
                }
                print(f"{product_type} scraping completed: {result['count']} products in {type_time:.2f}s")
                
            except Exception as e:
                results[product_type] = {
                    "status": "error",
                    "error": str(e),
                    "count": 0,
                    "time": round(time.time() - type_start, 2)
                }
                print(f"Error scraping {product_type}: {str(e)}")
        
        total_time = time.time() - start_time
        
        # 成功した商品数を計算
        total_success = sum(r["count"] for r in results.values() if r["status"] == "success")
        
        return {
            "success": all(r["status"] == "success" for r in results.values()),
            "total_products": total_success,
            "total_time": round(total_time, 2),
            "results": results,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        print(f"Error in scrape-all: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search", response_model=List[Product])
async def search_products(
    keyword: str = "トイレットペーパー",
    filter: Optional[str] = None,
    force: bool = False,
    scrape_token: Optional[str] = None
):
    import time
    start_time = time.time()
    
    try:
        # force=trueの場合はトークン検証（ローカル環境はスキップ）
        if force:
            # GitHub Actions環境またはトークンが設定されている場合のみチェック
            if os.getenv('GITHUB_ACTIONS') == 'true' or os.getenv('SCRAPE_AUTH_TOKEN'):
                expected_token = os.getenv('SCRAPE_AUTH_TOKEN')
                if not expected_token:
                    # トークンが設定されていない場合は、ランダムな文字列を生成
                    expected_token = secrets.token_urlsafe(32)
                    print(f"Warning: SCRAPE_AUTH_TOKEN not set. Generated token: {expected_token}")
                
                if scrape_token != expected_token:
                    raise HTTPException(status_code=403, detail="Invalid scrape token")
            else:
                # ローカル開発環境ではトークンチェックをスキップ
                print("Local environment detected - skipping token validation")
        
        # 強制更新でない限り、DBキャッシュを優先的に使用
        if not force:
            # DBから既存の商品を取得（4時間の制限なし）
            cached_products = await db.get_all_cached_products(filter)
            if cached_products:
                print(f"Returning {len(cached_products)} products from database")
                return cached_products
            else:
                print("No products in database, performing initial scraping...")
        
        # force=true の場合のみスクレイピング実行
        scraping_start = time.time()
        print(f"Force refresh requested - Scraping Amazon for: {keyword}")
        scraped_products = await scraper.search_products(keyword)
        scraping_time = time.time() - scraping_start
        print(f"Scraped {len(scraped_products)} products in {scraping_time:.2f}s")
        
        # テキスト解析と保存
        analysis_start = time.time()
        processed_products = []
        
        # 既存商品のASINリストを取得
        existing_products_dict = {}
        all_existing = await db.get_all_products()
        for existing in all_existing:
            existing_products_dict[existing['asin']] = existing
        
        print(f"Found {len(existing_products_dict)} existing products in database")
        
        new_products_count = 0
        updated_products_count = 0
        
        for product in scraped_products:
            # タイトルがない場合はスキップ
            if not product.get('title'):
                print(f"Skipping product without title: {product.get('asin', 'unknown')}")
                continue
            
            asin = product['asin']
            existing_product = existing_products_dict.get(asin)
            
            if existing_product:
                # 既存商品：価格のみ更新
                updated_products_count += 1
                
                # 価格が変わっていない場合はスキップ
                if existing_product.get('price') == product.get('price'):
                    print(f"No price change for {asin}, skipping")
                    
                    # 既存データをそのまま使用
                    processed_product = Product(
                        asin=existing_product['asin'],
                        title=existing_product['title'],
                        description=existing_product.get('description'),
                        brand=existing_product.get('brand'),
                        image_url=existing_product.get('image_url'),
                        price=existing_product.get('price'),
                        price_regular=existing_product.get('price_regular'),
                        discount_percent=existing_product.get('discount_percent'),
                        on_sale=existing_product.get('on_sale', False),
                        review_avg=existing_product.get('review_avg'),
                        review_count=existing_product.get('review_count'),
                        roll_count=existing_product.get('roll_count'),
                        length_m=existing_product.get('length_m'),
                        total_length_m=existing_product.get('total_length_m'),
                        price_per_roll=existing_product.get('price_per_roll'),
                        price_per_m=existing_product.get('price_per_m'),
                        is_double=existing_product.get('is_double')
                    )
                    processed_products.append(processed_product)
                    continue
                
                # 価格が変わった場合：価格関連フィールドのみ再計算
                print(f"Price changed for {asin}: {existing_product.get('price')} -> {product.get('price')}")
                
                # 既存の商品情報を使用して単価のみ再計算
                price_per_roll = None
                price_per_m = None
                
                if product.get('price') and existing_product.get('roll_count'):
                    price_per_roll = product['price'] / existing_product['roll_count']
                
                if product.get('price') and existing_product.get('total_length_m'):
                    price_per_m = product['price'] / existing_product['total_length_m']
                
                processed_product = Product(
                    asin=asin,
                    title=existing_product['title'],  # 既存データを保持
                    description=existing_product.get('description'),  # 既存データを保持
                    brand=existing_product.get('brand'),  # 既存データを保持
                    image_url=product.get('image_url'),  # 画像URLは更新
                    price=product.get('price'),  # 新しい価格
                    price_regular=product.get('price_regular'),  # 新しい定価
                    discount_percent=product.get('discount_percent'),  # 新しい割引率
                    on_sale=product.get('on_sale', False),  # 新しいセール状態
                    review_avg=product.get('review_avg'),  # 新しいレビュー
                    review_count=product.get('review_count'),  # 新しいレビュー数
                    roll_count=existing_product.get('roll_count'),  # 既存データを保持
                    length_m=existing_product.get('length_m'),  # 既存データを保持
                    total_length_m=existing_product.get('total_length_m'),  # 既存データを保持
                    price_per_roll=price_per_roll,  # 再計算
                    price_per_m=price_per_m,  # 再計算
                    is_double=existing_product.get('is_double')  # 既存データを保持
                )
                processed_products.append(processed_product)
                continue
            
            # 新商品：ChatGPT解析が必要
            new_products_count += 1
            print(f"New product detected: {asin}, analyzing with ChatGPT...")
            
            # テキスト解析
            extracted_info = await text_parser.extract_info(
                product['title'], 
                product.get('description', '')
            )
            
            # 詳細ページから取得が必要な場合の判定
            should_fetch_detail = False
            if product.get('asin'):
                # 長さ情報が取得できない場合
                if not extracted_info['length_m']:
                    if product.get('review_count', 0) > 1000:  # レビュー数が多い人気商品のみ
                        should_fetch_detail = True
                # 長さ情報が異常に短い場合（20m未満は疑わしい）
                elif extracted_info['length_m'] and extracted_info['length_m'] < 20:
                    if product.get('review_count', 0) > 500:  # 一定の評価がある商品のみ
                        should_fetch_detail = True
                        print(f"Suspicious short length ({extracted_info['length_m']}m) for {product['asin']}, will fetch detail page")
                
                if should_fetch_detail:
                    print(f"No length info for {product['asin']}, fetching detail page...")
                    try:
                        detail_info = await scraper.get_product_detail(product['asin'])
                        print(f"Detail info retrieved for {product['asin']}: {list(detail_info.keys())}")
                        
                        # description、features の順で解析を試みる
                        for detail_key in ['description', 'features']:
                            if detail_info.get(detail_key):
                                print(f"Analyzing {detail_key} content: {detail_info[detail_key][:200]}...")
                                # 詳細情報で再度解析（長さ情報のみ抽出）
                                extracted_info_detail = await text_parser.extract_info(
                                    product['title'],
                                    detail_info[detail_key]
                                )
                                print(f"Extracted from {detail_key}: {extracted_info_detail}")
                                # 長さ情報が取得できたら更新（詳細ページの情報を優先）
                                if extracted_info_detail['length_m']:
                                    extracted_info['length_m'] = extracted_info_detail['length_m']
                                    print(f"Updated length from detail page: {extracted_info['length_m']}m")
                                    # 既存のロール数を保持して総長さを再計算
                                    if extracted_info['roll_count']:
                                        extracted_info['total_length_m'] = extracted_info['roll_count'] * extracted_info['length_m']
                                    break
                                # ロール数情報のみ取得できて、既存のロール数がない場合のみ更新
                                elif extracted_info_detail['roll_count'] and not extracted_info['roll_count']:
                                    extracted_info['roll_count'] = extracted_info_detail['roll_count']
                                    print(f"Updated roll count from detail page: {extracted_info['roll_count']}")
                                    if extracted_info['length_m']:
                                        extracted_info['total_length_m'] = extracted_info['roll_count'] * extracted_info['length_m']
                    except Exception as e:
                        print(f"Error fetching detail for {product['asin']}: {str(e)}")
            
            # 単価計算
            price_per_roll = None
            price_per_m = None
            
            if product.get('price') and extracted_info['roll_count']:
                price_per_roll = product['price'] / extracted_info['roll_count']
            
            if product.get('price') and extracted_info['total_length_m']:
                price_per_m = product['price'] / extracted_info['total_length_m']
            
            # 新商品の場合は価格検証スキップ（初回なので基準がない）
            
            # 商品データ作成
            processed_product = Product(
                asin=product['asin'],
                title=product.get('title', ''),
                description=product.get('description'),
                brand=product.get('brand'),
                image_url=product.get('image_url'),
                price=product.get('price'),
                price_regular=product.get('price_regular'),
                discount_percent=product.get('discount_percent'),
                on_sale=product.get('on_sale', False),
                review_avg=product.get('review_avg'),
                review_count=product.get('review_count'),
                roll_count=int(extracted_info['roll_count']) if extracted_info['roll_count'] else None,
                length_m=extracted_info['length_m'],
                total_length_m=extracted_info['total_length_m'],
                price_per_roll=price_per_roll,
                price_per_m=price_per_m,
                is_double=extracted_info['is_double']
            )
            processed_products.append(processed_product)
        
        analysis_time = time.time() - analysis_start
        print(f"Processing summary:")
        print(f"  - New products (ChatGPT analyzed): {new_products_count}")
        print(f"  - Updated products (price only): {updated_products_count}")
        print(f"  - Total processed: {len(processed_products)}")
        print(f"  - Analysis time: {analysis_time:.2f}s")
        
        # データベースに保存
        db_start = time.time()
        await db.upsert_products(processed_products)
        db_time = time.time() - db_start
        print(f"Saved to database in {db_time:.2f}s")
        
        # フィルタリング
        if filter == 'single':
            processed_products = [p for p in processed_products if p.is_double == False]
        elif filter == 'double':
            processed_products = [p for p in processed_products if p.is_double == True]
        elif filter == 'sale':
            processed_products = [p for p in processed_products if p.on_sale]
        
        # ソート（単価順）
        processed_products.sort(key=lambda p: p.price_per_m or float('inf'))
        
        total_time = time.time() - start_time
        print(f"Total processing time: {total_time:.2f}s")
        
        return processed_products
        
    except Exception as e:
        print(f"Error in search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/refetch-product/{asin}")
async def refetch_single_product(asin: str):
    """個別商品の完全再フェッチ（ChatGPT解析含む）"""
    import time
    start_time = time.time()
    
    try:
        print(f"Full refetch requested for ASIN: {asin}")
        
        # 既存の商品データを取得（タイトル保持のため）
        existing_product = await db.get_product_by_asin(asin)
        if not existing_product:
            raise HTTPException(status_code=404, detail=f"Product {asin} not found in database")
        
        print(f"Existing product title: '{existing_product.get('title', '')}'")
        print(f"Existing product keys: {list(existing_product.keys())}")
        
        # 商品詳細ページから最新情報を取得
        detail_start = time.time()
        detail_info = await scraper.get_product_detail(asin)
        if not detail_info:
            raise HTTPException(status_code=404, detail=f"Product {asin} not found on Amazon")
        detail_time = time.time() - detail_start
        print(f"Fetched product detail in {detail_time:.2f}s")
        print(f"Detail info keys: {list(detail_info.keys())}")
        print(f"Detail info title: '{detail_info.get('title', '')}'")
        
        # タイトルが取得できない場合は既存のタイトルを使用
        title = detail_info.get('title') or existing_product.get('title', '')
        
        # タイトルがない場合、詳細説明から商品名を抽出
        if not title and detail_info.get('description'):
            description = detail_info.get('description', '')
            # 「パフィー 長さが3倍 75m×12ロール ダブル」のような商品名を抽出
            import re
            # 商品説明の最初の部分から商品名らしき部分を抽出
            match = re.search(r'「([^」]+)」', description)
            if match:
                title = match.group(1)
                print(f"Extracted title from description: '{title}'")
            else:
                # より簡単なパターンで抽出を試みる
                lines = description.split('●')
                for line in lines:
                    if 'ロール' in line and 'ダブル' in line or 'シングル' in line:
                        # 不要な文字を除去してタイトルとして使用
                        title = re.sub(r'[●※*]', '', line).strip()
                        if len(title) > 10:  # 十分な長さがある場合のみ
                            title = title[:50]  # 長すぎる場合は切り詰め
                            print(f"Extracted title from pattern: '{title}'")
                            break
        
        if not title:
            print(f"Warning: No title found for {asin}, using fallback")
            title = f'Product {asin}'
        
        print(f"Final title to use: '{title}'")
        
        # ChatGPTで完全解析
        analysis_start = time.time()
        description = detail_info.get('description', '') + ' ' + detail_info.get('features', '')
        
        # ChatGPT解析にはタイトルと詳細説明の両方を使用
        extracted_info = await text_parser.extract_info(title, description)
        analysis_time = time.time() - analysis_start
        print(f"ChatGPT analysis completed in {analysis_time:.2f}s")
        
        # 単価計算
        price_per_roll = None
        price_per_m = None
        
        if detail_info.get('price') and extracted_info['roll_count']:
            price_per_roll = detail_info['price'] / extracted_info['roll_count']
        
        if detail_info.get('price') and extracted_info['total_length_m']:
            price_per_m = detail_info['price'] / extracted_info['total_length_m']
        
        # 商品データ作成（新情報と既存情報をマージ）
        updated_product = Product(
            asin=asin,
            title=title,  # 修正されたタイトルを使用
            description=detail_info.get('description') or existing_product.get('description'),
            brand=detail_info.get('brand') or existing_product.get('brand'),
            image_url=detail_info.get('image_url') or existing_product.get('image_url'),
            price=detail_info.get('price') or existing_product.get('price'),
            price_regular=detail_info.get('price_regular') or existing_product.get('price_regular'),
            discount_percent=detail_info.get('discount_percent') or existing_product.get('discount_percent'),
            on_sale=detail_info.get('on_sale', existing_product.get('on_sale', False)),
            review_avg=detail_info.get('review_avg') or existing_product.get('review_avg'),
            review_count=detail_info.get('review_count') or existing_product.get('review_count'),
            roll_count=int(extracted_info['roll_count']) if extracted_info['roll_count'] else None,
            length_m=extracted_info['length_m'],
            total_length_m=extracted_info['total_length_m'],
            price_per_roll=price_per_roll,
            price_per_m=price_per_m,
            is_double=extracted_info['is_double']
        )
        
        # データベースに保存
        db_start = time.time()
        await db.upsert_products([updated_product])
        db_time = time.time() - db_start
        
        total_time = time.time() - start_time
        print(f"Product {asin} refetched successfully in {total_time:.2f}s")
        
        return {
            "success": True,
            "asin": asin,
            "product": updated_product,
            "timing": {
                "detail_fetch": detail_time,
                "analysis": analysis_time,
                "database": db_time,
                "total": total_time
            }
        }
        
    except Exception as e:
        print(f"Error refetching product {asin}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dishwashing/search")
async def search_dishwashing_products(
    keyword: str = "食器用洗剤",
    filter: Optional[str] = None,
    force: bool = False,
    scrape_token: Optional[str] = None
):
    """食器用洗剤の検索エンドポイント"""
    import time
    start_time = time.time()
    
    try:
        # force=trueの場合はトークン検証（ローカル環境はスキップ）
        if force:
            # GitHub Actions環境またはトークンが設定されている場合のみチェック
            if os.getenv('GITHUB_ACTIONS') == 'true' or os.getenv('SCRAPE_AUTH_TOKEN'):
                expected_token = os.getenv('SCRAPE_AUTH_TOKEN')
                if not expected_token:
                    # トークンが設定されていない場合は、ランダムな文字列を生成
                    expected_token = secrets.token_urlsafe(32)
                    print(f"Warning: SCRAPE_AUTH_TOKEN not set. Generated token: {expected_token}")
                
                if scrape_token != expected_token:
                    raise HTTPException(status_code=403, detail="Invalid scrape token")
            else:
                # ローカル開発環境ではトークンチェックをスキップ
                print("Local environment detected - skipping token validation")
        
        # 強制更新でない限り、DBキャッシュを優先的に使用
        if not force:
            cached_products = await db.get_all_dishwashing_products(filter)
            if cached_products:
                print(f"Returning {len(cached_products)} dishwashing products from database")
                return cached_products
            else:
                print("No dishwashing products in database, performing initial scraping...")
        
        # force=true の場合のみスクレイピング実行
        print(f"Force refresh requested - Scraping Amazon for: {keyword}")
        scraped_products = await scraper.search_products(keyword)
        print(f"Scraped {len(scraped_products)} products")
        
        # 処理と保存
        processed_products = []
        for product in scraped_products:
            if not product.get('title'):
                continue
            
            # ChatGPT解析
            extracted_info = await text_parser.extract_dishwashing_info(
                product['title'], 
                product.get('description', '')
            )
            
            # 食洗機用製品はスキップ
            if extracted_info.get('is_dishwasher', False):
                print(f"Skipping dishwasher product: {product.get('title', 'unknown')[:50]}")
                continue
            
            # volume_mlがnullまたは0の場合もスキップ
            if not extracted_info.get('volume_ml'):
                print(f"Skipping product with no volume: {product.get('title', 'unknown')[:50]}")
                continue
            
            # 単価計算
            price_per_1000ml = None
            if product.get('price') and extracted_info.get('volume_ml'):
                price_per_1000ml = (product['price'] / extracted_info['volume_ml']) * 1000
            
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
                'volume_ml': extracted_info.get('volume_ml'),
                'price_per_1000ml': price_per_1000ml,
                'is_refill': extracted_info.get('is_refill', False)
            }
            processed_products.append(processed_product)
        
        # データベースに保存
        await db.save_dishwashing_products(processed_products)
        
        # フィルタリング
        if filter == 'refill':
            processed_products = [p for p in processed_products if p['is_refill'] == True]
        elif filter == 'regular':
            processed_products = [p for p in processed_products if p['is_refill'] == False]
        elif filter == 'sale':
            processed_products = [p for p in processed_products if p['on_sale']]
        
        # ソート（単価順）
        processed_products.sort(key=lambda p: p['price_per_1000ml'] or float('inf'))
        
        total_time = time.time() - start_time
        print(f"Total processing time: {total_time:.2f}s")
        
        return processed_products
        
    except Exception as e:
        import traceback
        print(f"Error in dishwashing search: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    await scraper.close()
    await text_parser.close()