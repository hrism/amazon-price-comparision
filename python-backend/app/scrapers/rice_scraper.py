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

async def scrape_rice(keyword: str = "米", check_out_of_stock: bool = True) -> List[Dict[str, Any]]:
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
    
    # Chrome 141に対応するバージョンを指定
    driver = uc.Chrome(options=options, version_main=141)
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
                    
                    # 現在の価格を取得
                    price_elem = element.select_one('.a-price .a-offscreen')
                    if not price_elem:
                        price_elem = element.select_one('.a-price-whole')
                    
                    # 在庫切れチェック
                    out_of_stock = False
                    if check_out_of_stock:
                        # 複数の方法で在庫状況を確認
                        
                        # 方法1: a-color-price, a-color-stateクラスで在庫切れテキストをチェック
                        availability_elem = element.select_one('.a-color-price, .a-color-state')
                        if availability_elem:
                            availability_text = availability_elem.text.strip()
                            if any(keyword in availability_text for keyword in ['在庫切れ', '現在在庫切れ', '現在お取り扱いできません', '入荷未定', '一時的に在庫切れ']):
                                out_of_stock = True
                                print(f"[DEBUG] Out of stock (method 1): {title[:50]}... - {availability_text}")
                        
                        # 方法2: 価格表示がない、またはAddToCartボタンがない場合
                        add_to_cart = element.select_one('[data-action="s-card-button"]')
                        if not add_to_cart and not price_elem:
                            # 価格もカートボタンもない場合は在庫切れの可能性
                            out_of_stock = True
                            print(f"[DEBUG] Out of stock (method 2 - no price/cart): {title[:50]}...")
                    
                    price = 0
                    if price_elem:
                        price_text = price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                        try:
                            price = int(float(re.sub(r'[^\d.]', '', price_text)))
                        except:
                            price = 0
                    
                    # 価格が0の場合も在庫切れとマーク
                    if price <= 0:
                        out_of_stock = True
                        print(f"[DEBUG] No price found, marking as out of stock: {title[:50]}...")
                    
                    # 元の価格（セール前価格）を取得
                    price_regular = price  # デフォルトは現在価格と同じ
                    
                    # 方法1: .a-text-priceから取得（複数ある場合は2番目が元価格）
                    regular_price_elems = element.select('.a-text-price')
                    for regular_price_elem in regular_price_elems:
                        regular_text = regular_price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                        # "8602860 や "¥8,602¥8,602" のような重複を処理
                        # 最初の価格のみを取得
                        price_match = re.search(r'(\d+)', regular_text)
                        if price_match:
                            try:
                                # 数値が異常に大きい場合（価格の重複）は半分にする
                                temp_regular = int(price_match.group(1))
                                if temp_regular > 100000:  # 10万円以上は異常値
                                    # 桁数を確認して半分にする
                                    str_price = str(temp_regular)
                                    half_len = len(str_price) // 2
                                    if len(str_price) % 2 == 0 and str_price[:half_len] == str_price[half_len:]:
                                        # 同じ数字の繰り返しなら半分にする
                                        temp_regular = int(str_price[:half_len])
                                
                                # 元の価格が現在価格より高い場合のみ有効（セール中）
                                if temp_regular > price and temp_regular < 100000:  # 妥当な価格範囲
                                    price_regular = temp_regular
                                    print(f"[DEBUG] Sale detected via a-text-price for {title[:30]}... - Original: ¥{temp_regular}, Sale: ¥{price}")
                                    break
                            except:
                                pass
                    
                    # 方法2: "Was: ¥X,XXX" パターンを探す  
                    # 価格リンクやセカンダリテキストに "Was:" が含まれることが多い
                    was_elements = element.select('.a-color-secondary, .s-price-instructions-style, a.s-link-style, .a-price + *')
                    
                    for was_elem in was_elements:
                        if 'Was:' in was_elem.text or '以前は' in was_elem.text:
                            # "Was: ¥9,710" または "以前は¥9,710" のようなパターンを探す
                            was_match = re.search(r'(?:Was:|以前は)\s*[¥￥]?([\d,]+)', was_elem.text)
                            if was_match:
                                try:
                                    was_price = int(float(was_match.group(1).replace(',', '')))
                                    if was_price > price:
                                        price_regular = was_price
                                        print(f"[DEBUG] Sale detected via 'Was/以前は' price for {title[:30]}... - Original: ¥{was_price}, Sale: ¥{price}")
                                        break
                                except:
                                    pass
                    
                    # 方法3: 価格リンク内の複数価格パターン（"¥8,602 以前は¥9,710"）
                    price_link = element.select_one('a.s-link-style')
                    if price_link:
                        # 複数の価格が含まれているかチェック
                        all_prices = re.findall(r'[¥￥]([\d,]+)', price_link.text)
                        if len(all_prices) >= 2:
                            try:
                                # 最も高い価格を元値とする
                                prices = [int(p.replace(',', '')) for p in all_prices]
                                max_price = max(prices)
                                if max_price > price:
                                    price_regular = max_price
                                    print(f"[DEBUG] Sale detected via multiple prices for {title[:30]}... - Original: ¥{max_price}, Sale: ¥{price}")
                            except:
                                pass
                    
                    # 割引パーセンテージを直接探す
                    discount_found = False
                    discount_value = 0
                    
                    # 複数の方法で割引情報を探す
                    # 方法1: セールバッジ
                    sale_badge = element.select_one('.s-badge-text, .a-badge-text')
                    if sale_badge and 'セール' in sale_badge.text:
                        print(f"[DEBUG] Sale badge found for {title[:30]}...")
                        discount_found = True
                    
                    # 方法2: 割引バッジを探す
                    savings_elem = element.select_one('.savingsPercentage')
                    if savings_elem:
                        text = savings_elem.text.strip()
                        match = re.search(r'(\d+)%', text)
                        if match:
                            discount_value = int(match.group(1))
                            discount_found = True
                            print(f"[DEBUG] Found savings percentage for {title[:30]}... - {text}")
                    
                    # 方法3: 割引パーセンテージのテキストを探す（例：「11%割引」）
                    if not discount_found:
                        for span in element.select('span'):
                            text = span.text.strip()
                            # "11パーセントの割引" や "11%割引" や "-11%" のパターンを探す
                            if 'パーセント' in text and '割引' in text:
                                match = re.search(r'(\d+)\s*パーセント', text)
                                if match:
                                    discount_value = int(match.group(1))
                                    discount_found = True
                                    print(f"[DEBUG] Found discount text for {title[:30]}... - {text}")
                                    break
                            elif '割引' in text:
                                match = re.search(r'(\d+)%?\s*割引', text)
                                if match:
                                    discount_value = int(match.group(1))
                                    discount_found = True
                                    print(f"[DEBUG] Found discount text for {title[:30]}... - {text}")
                                    break
                            elif re.match(r'^-?\d+%$', text):
                                match = re.search(r'(\d+)%', text)
                                if match:
                                    discount_value = int(match.group(1))
                                    discount_found = True
                                    print(f"[DEBUG] Found discount percentage for {title[:30]}... - {text}")
                                    break
                    
                    # 割引が見つかった場合は元の価格を計算
                    if discount_found and discount_value > 0 and price > 0:
                        # 割引率から元の価格を逆算
                        calculated_regular = round(price / (1 - discount_value / 100))
                        if calculated_regular > price_regular:
                            price_regular = calculated_regular
                            print(f"[DEBUG] Calculated original price for {title[:30]}... - Discount: {discount_value}%, Original: ¥{calculated_regular}, Sale: ¥{price}")
                    
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
                    
                    # レビュー数 - 複数のセレクタを試す
                    review_count_elem = (
                        element.select_one('span[aria-label*="件の評価"]') or
                        element.select_one('.s-link-style .s-underline-text') or
                        element.select_one('[data-csa-c-content-id] .s-underline-text') or
                        element.select_one('.a-size-base.s-underline-text') or
                        element.select_one('[data-cy="reviews-ratings-slot"] span.a-size-base') or
                        element.select_one('[aria-label*="つ星のうち"] + span') or
                        element.select_one('a[href*="customerReviews"] span')
                    )

                    review_count = 0
                    if review_count_elem:
                        count_text = review_count_elem.text.replace(',', '').replace('(', '').replace(')', '').strip()
                        # "1,234" や "1,234件の評価" のような形式に対応
                        match = re.search(r'(\d+(?:,\d+)*)', count_text)
                        if match:
                            try:
                                review_count = int(match.group(1).replace(',', ''))
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
                    if discount_found and discount_value > 0:
                        # 直接検出された割引率を使用
                        discount_percent = discount_value
                    elif price_regular > price and price > 0:
                        # 価格差から計算
                        discount_percent = round((1 - price / price_regular) * 100)
                    
                    # 単価計算
                    price_per_kg = None
                    if weight_kg and weight_kg > 0 and price > 0:
                        price_per_kg = round(price / weight_kg, 2)
                    
                    # 在庫切れの場合は価格を0にする
                    if out_of_stock:
                        price = 0
                        price_regular = 0
                        price_per_kg = None
                        discount_percent = 0
                    
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
                        'on_sale': discount_percent > 0,
                        'out_of_stock': out_of_stock
                    }
                    
                    # 重量が取得できる商品のみ追加（在庫切れでも重量情報があれば追加）
                    if weight_kg:
                        products.append(product)
                        if out_of_stock:
                            print(f"[DEBUG] Added out-of-stock product: {title[:50]}...")
                        else:
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
            # out_of_stock フィールドを確実に設定
            if 'out_of_stock' not in product:
                product['out_of_stock'] = False
        
        result = supabase.table("rice_products").insert(products_list).execute()
        
        print(f"Saved {len(products_list)} rice products to database (from {len(products)} total with duplicates)")
        return {"status": "success", "count": len(products_list)}
        
    except Exception as e:
        print(f"Error saving rice products to database: {e}")
        return {"status": "error", "error": str(e), "count": 0}