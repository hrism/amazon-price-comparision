from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

from .scraper import AmazonScraper
from .chatgpt_parser import ChatGPTParser
from .database import Database

load_dotenv()

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初期化
scraper = AmazonScraper()
text_parser = ChatGPTParser()
db = Database()

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

@app.get("/api/search", response_model=List[Product])
async def search_products(
    keyword: str = "トイレットペーパー",
    filter: Optional[str] = None,
    force: bool = False
):
    try:
        # キャッシュチェック
        if not force:
            cached_products = await db.get_cached_products(keyword, filter)
            if cached_products:
                print(f"Returning {len(cached_products)} cached products")
                return cached_products
        
        # スクレイピング
        print(f"Scraping Amazon for: {keyword}")
        scraped_products = await scraper.search_products(keyword)
        print(f"Scraped {len(scraped_products)} products")
        
        # テキスト解析と保存
        processed_products = []
        for product in scraped_products:
            # タイトルがない場合はスキップ
            if not product.get('title'):
                print(f"Skipping product without title: {product.get('asin', 'unknown')}")
                continue
                
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
        
        # データベースに保存
        await db.upsert_products(processed_products)
        
        # フィルタリング
        if filter == 'single':
            processed_products = [p for p in processed_products if p.is_double == False]
        elif filter == 'double':
            processed_products = [p for p in processed_products if p.is_double == True]
        elif filter == 'sale':
            processed_products = [p for p in processed_products if p.on_sale]
        
        # ソート（単価順）
        processed_products.sort(key=lambda p: p.price_per_m or float('inf'))
        
        return processed_products
        
    except Exception as e:
        print(f"Error in search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    await scraper.close()
    await text_parser.close()