import re
import json
from typing import Dict, List, Optional
from datetime import datetime
import asyncio
import time
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from app.services.gpt_parser import parse_mineral_water_info
from app.database import Database

async def scrape_mineral_water(keyword: str = "ミネラルウォーター") -> List[Dict]:
    """ミネラルウォーター商品をスクレイピング"""
    products = []
    
    # Initialize Chrome driver
    options = uc.ChromeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--lang=ja-JP')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    options.add_experimental_option("prefs", {
        "intl.accept_languages": "ja,ja-JP"
    })
    
    driver = uc.Chrome(options=options)
    driver.implicitly_wait(10)
    
    try:
        # Amazonの検索ページにアクセス
        search_url = f"https://www.amazon.co.jp/s?k={keyword}&language=ja_JP"
        print(f"[DEBUG] Navigating to: {search_url}")
        driver.get(search_url)
        time.sleep(2)
        
        # ページタイトルを取得して確認
        title = driver.title
        print(f"[DEBUG] Page title: {title}")
        current_url = driver.current_url
        print(f"[DEBUG] Current URL: {current_url}")
        
        # ページのHTMLを取得
        content = driver.page_source
        print(f"[DEBUG] Page source length: {len(content)}")
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # 検索結果の商品を取得
        product_elements = soup.select('[data-component-type="s-search-result"]')
        print(f"[DEBUG] Found {len(product_elements)} search result elements")
        
        if not product_elements:
            print("[WARNING] No products found on page")
            return []
        
        for element in product_elements:
            try:
                # ASIN取得
                asin = element.get('data-asin', '')
                if not asin:
                    continue
                
                # タイトル（複数のセレクタを試す）
                title_elem = element.select_one('h2 span')
                if not title_elem:
                    title_elem = element.select_one('[data-cy="title-recipe"] span')
                if not title_elem:
                    title_elem = element.select_one('.s-title-instructions-style span')
                
                title = title_elem.text.strip() if title_elem else ''
                
                if not title:
                    continue
                
                # 画像URL
                img_elem = element.select_one('img.s-image')
                image_url = img_elem.get('src', '') if img_elem else ''
                
                # 価格
                price_elem = element.select_one('.a-price .a-offscreen')
                if not price_elem:
                    price_elem = element.select_one('.a-price-whole')
                
                price = 0
                if price_elem:
                    price_text = price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                    try:
                        # 小数点がある場合は整数に変換
                        price = int(float(re.sub(r'[^\d.]', '', price_text)))
                    except:
                        price = 0
                
                # 通常価格（セール前価格）
                regular_price_elem = element.select_one('.a-text-price .a-offscreen')
                if not regular_price_elem:
                    regular_price_elem = element.select_one('.a-text-price')
                
                price_regular = price
                if regular_price_elem:
                    regular_price_text = regular_price_elem.text.replace(',', '').replace('¥', '')
                    try:
                        price_regular = int(re.sub(r'[^\d]', '', regular_price_text))
                    except:
                        price_regular = price
                
                # セール判定と割引率
                on_sale = price_regular > price if price > 0 and price_regular > 0 else False
                discount_percent = 0
                if on_sale and price_regular > 0:
                    discount_percent = round((1 - price / price_regular) * 100, 2)
                
                # レビュー情報
                review_elem = element.select_one('[aria-label*="つ星のうち"]')
                review_avg = 0.0
                if review_elem:
                    review_text = review_elem.get('aria-label', '')
                    # 「5つ星のうち4.3」のようなテキストから4.3を抽出
                    # うち の後の数値を抽出
                    review_match = re.search(r'うち\s*(\d+(?:\.\d+)?)', review_text)
                    if review_match:
                        review_avg = float(review_match.group(1))
                    else:
                        # fallback: スパンのテキストから直接取得
                        alt_elem = element.select_one('.a-icon-alt')
                        if alt_elem and alt_elem.text:
                            # "5つ星のうち4.4"形式のテキストから数値を抽出
                            alt_match = re.search(r'(\d+\.\d+)', alt_elem.text)
                            if alt_match:
                                review_avg = float(alt_match.group(1))
                            else:
                                # 整数のみの場合
                                alt_match = re.search(r'うち\s*(\d+)', alt_elem.text)
                                if alt_match:
                                    review_avg = float(alt_match.group(1))
                
                # レビュー数
                review_count_elem = element.select_one('[aria-label*="つ星のうち"] + span')
                review_count = 0
                if review_count_elem:
                    review_count_text = review_count_elem.text
                    review_count_match = re.search(r'[\d,]+', review_count_text)
                    if review_count_match:
                        review_count = int(review_count_match.group(0).replace(',', ''))
                
                # 説明文（箇条書き部分）
                description_parts = []
                feature_elem = element.select_one('.puis-padding-left-small')
                if feature_elem:
                    description_parts.append(feature_elem.text.strip())
                
                description = ' '.join(description_parts)
                
                # ブランド情報
                brand_elem = element.select_one('[data-cy="title-recipe"] .puis-text-brand')
                if not brand_elem:
                    brand_elem = element.select_one('.s-size-mini')
                brand = brand_elem.text.strip() if brand_elem else None
                
                product = {
                    'asin': asin,
                    'title': title,
                    'description': description,
                    'image_url': image_url,
                    'price': price,
                    'price_regular': price_regular,
                    'on_sale': on_sale,
                    'discount_percent': discount_percent if discount_percent > 0 else None,
                    'review_avg': review_avg if review_avg > 0 else None,
                    'review_count': review_count if review_count > 0 else None,
                    'brand': brand,
                    'last_fetched_at': datetime.now().isoformat()
                }
                
                products.append(product)
                
            except Exception as e:
                print(f"[ERROR] Failed to parse product: {str(e)}")
                continue
        
        print(f"[SUCCESS] Found {len(products)} products")
        
    except Exception as e:
        print(f"[ERROR] Scraping failed: {str(e)}")
        raise
    finally:
        driver.quit()
    
    # GPT-4でミネラルウォーター情報を抽出
    for product in products:
        try:
            extracted_info = parse_mineral_water_info(product['title'], product.get('description', ''))
            print(f"Mineral water extracted from '{product['title'][:50]}...': {extracted_info}")
            
            if extracted_info:
                product.update(extracted_info)
                
                # 1リットルあたりの価格を計算
                if product.get('total_volume_ml') and product.get('price'):
                    price_per_liter = (product['price'] / product['total_volume_ml']) * 1000
                    product['price_per_liter'] = round(price_per_liter, 2)
        except Exception as e:
            print(f"[ERROR] Failed to parse mineral water info for {product['title']}: {str(e)}")
    
    return products

def save_mineral_water_to_db(products: List[Dict]) -> Dict:
    """ミネラルウォーター商品をデータベースに保存"""
    if not products:
        return {'upserted': 0, 'errors': 0}
    
    # 各商品のデータを検証
    for product in products:
        # デバッグ出力
        print(f"Sample product data keys: {list(product.keys())}")
        print(f"Sample product data: {product}")
        break  # 最初の1件だけ出力
    
    # Databaseインスタンスを作成
    db = Database()
    if not db.enabled or not db.supabase:
        print("[ERROR] Database is not enabled")
        return {'upserted': 0, 'errors': 0}
    
    # Supabaseにアップサート
    upserted = 0
    errors = 0
    
    for product in products:
        try:
            # NoneやNaN値をクリーンアップ
            cleaned_product = {}
            for key, value in product.items():
                if value is not None and value != '' and str(value).lower() != 'nan':
                    cleaned_product[key] = value
            
            result = db.supabase.table('mineral_water_products').upsert(
                cleaned_product,
                on_conflict='asin'
            ).execute()
            upserted += 1
        except Exception as e:
            print(f"[ERROR] Failed to upsert product {product.get('asin', 'unknown')}: {str(e)}")
            errors += 1
    
    print(f"Upserted {upserted} products successfully, {errors} errors")
    return {'upserted': upserted, 'errors': errors}