"""
米商品のスクレイピングモジュール
"""

import re
import json
import os
import time
from typing import List, Dict, Any
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
# GPTパーサーは使用しない（BeautifulSoupで直接パース）

load_dotenv()

# Supabaseクライアントの初期化
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

async def scrape_rice(keyword: str = "米") -> List[Dict[str, Any]]:
    """
    米商品をスクレイピングする
    カテゴリフィルター付きでAmazon検索を実行
    """
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
        # カテゴリフィルター付きのURL構築
        # n:2421961051 = 米カテゴリ
        # p_n_feature_nine_browse-bin:2421946051|2421947051 = 精米・無洗米
        base_url = f"https://www.amazon.co.jp/s?i=food-beverage&rh=n:2421961051,p_n_feature_nine_browse-bin:2421946051|2421947051&keywords={keyword}"
        
        # 最大5ページまでスクレイピング
        max_pages = 5
        
        for page_num in range(1, max_pages + 1):
            if page_num == 1:
                search_url = base_url
            else:
                search_url = f"{base_url}&page={page_num}"
            
            print(f"[DEBUG] Page {page_num}: Navigating to: {search_url}")
            driver.get(search_url)
            time.sleep(2)
            
            # ページタイトルを取得して確認
            title = driver.title
            print(f"[DEBUG] Page {page_num} title: {title}")
            
            # ページのHTMLを取得
            content = driver.page_source
            print(f"[DEBUG] Page {page_num} source length: {len(content)}")
            
            soup = BeautifulSoup(content, 'html.parser')
            
            # 検索結果の商品を取得
            product_elements = soup.select('[data-component-type="s-search-result"]')
            print(f"[DEBUG] Page {page_num}: Found {len(product_elements)} search result elements")
            
            if not product_elements:
                print(f"[WARNING] No products found on page {page_num}, stopping pagination")
                break
            
            for element in product_elements:
                try:
                    # ASIN取得
                    asin = element.get('data-asin', '')
                    if not asin:
                        continue
                    
                    # タイトル
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
                            price = int(float(re.sub(r'[^\d.]', '', price_text)))
                        except:
                            price = 0
                    
                    # 通常価格（セール前価格）
                    regular_price_elem = element.select_one('.a-text-price .a-offscreen')
                    if not regular_price_elem:
                        regular_price_elem = element.select_one('.a-text-price')
                    
                    price_regular = price
                    if regular_price_elem:
                        regular_text = regular_price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                        try:
                            price_regular = int(float(re.sub(r'[^\d.]', '', regular_text)))
                        except:
                            price_regular = price
                    
                    # レビュー情報（ミネラルウォーターと同じ方法）
                    review_elem = element.select_one('[aria-label*="つ星のうち"]')
                    review_avg = 0.0
                    if review_elem:
                        review_text = review_elem.get('aria-label', '')
                        # 「5つ星のうち4.3」のようなテキストから4.3を抽出
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
                    review_count_elem = element.select_one('[data-csa-c-content-id] .s-underline-text')
                    if not review_count_elem:
                        review_count_elem = element.select_one('.a-size-base.s-underline-text')
                    
                    review_count = 0
                    if review_count_elem:
                        count_text = review_count_elem.text.replace(',', '').strip()
                        match = re.search(r'(\d+)', count_text)
                        if match:
                            try:
                                review_count = int(match.group(1))
                            except:
                                review_count = 0
                    
                    # タイトルから重量を抽出（共通関数を使用）
                    from app.prompts.rice import extract_weight_from_title
                    weight_kg = extract_weight_from_title(title)
                    
                    # 米の品種を抽出
                    rice_types = [
                        'コシヒカリ', 'こしひかり', 'あきたこまち', '秋田小町',
                        'ひとめぼれ', 'はえぬき', 'ななつぼし', 'ゆめぴりか',
                        'つや姫', 'ミルキークイーン', 'きぬむすめ', 'にこまる',
                        'ヒノヒカリ', 'あさひの夢', 'きらら397', '森のくまさん', 'さがびより'
                    ]
                    rice_type = None
                    title_lower = title.lower()
                    for rt in rice_types:
                        if rt.lower() in title_lower:
                            rice_type = rt
                            break
                    
                    # 無洗米判定
                    is_musenmai = any(keyword in title for keyword in ['無洗米', 'むせんまい', '無洗'])
                    
                    # 割引率計算
                    discount_percent = 0
                    if price_regular > price and price > 0:
                        discount_percent = round((1 - price / price_regular) * 100)
                    
                    # 単価計算
                    price_per_kg = None
                    if weight_kg and weight_kg > 0 and price > 0:
                        price_per_kg = round(price / weight_kg, 2)
                    
                    product = {
                        'asin': asin,
                        'title': title,
                        'image_url': image_url,
                        'price': price,
                        'price_regular': price_regular,
                        'review_avg': review_avg,
                        'review_count': review_count,
                        'weight_kg': weight_kg,
                        'price_per_kg': price_per_kg,
                        'rice_type': rice_type,
                        'is_musenmai': is_musenmai,
                        'discount_percent': discount_percent,
                        'on_sale': discount_percent > 0
                    }
                    
                    # 重量と単価が計算できる商品のみ追加
                    if weight_kg and price_per_kg:
                        products.append(product)
                        print(f"[DEBUG] Added product: {title[:50]}... - {weight_kg}kg - ¥{price_per_kg}/kg")
                    
                except Exception as e:
                    print(f"[ERROR] Failed to parse product element: {e}")
                    continue
        
    finally:
        driver.quit()
    
    print(f"Total rice products found: {len(products)}")
    return products

async def save_rice_to_db(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    米商品データをデータベースに保存
    """
    if not products:
        return {"status": "no_data", "count": 0}
    
    try:
        # 重複を除去（ASINでユニークにする）
        unique_products = {}
        for product in products:
            asin = product.get('asin')
            if asin and asin not in unique_products:
                unique_products[asin] = product
        
        products_list = list(unique_products.values())
        
        # 既存データをクリア
        supabase.table("rice_products").delete().neq("asin", "").execute()
        
        # 新規データを挿入
        # UTCで現在時刻を取得
        now = datetime.now(timezone.utc).isoformat()
        for product in products_list:
            product['last_fetched_at'] = now
            product['on_sale'] = bool(product.get('discount_percent', 0) > 0)
        
        result = supabase.table("rice_products").insert(products_list).execute()
        
        print(f"Saved {len(products_list)} rice products to database (from {len(products)} total with duplicates)")
        return {"status": "success", "count": len(products_list)}
        
    except Exception as e:
        print(f"Error saving rice products to database: {e}")
        return {"status": "error", "error": str(e), "count": 0}