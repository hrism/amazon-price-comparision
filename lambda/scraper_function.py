import json
import os
import asyncio
from datetime import datetime
import boto3
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import requests
from typing import List, Dict, Any

def get_chrome_driver():
    """Chrome WebDriverの設定"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-dev-tools')
    chrome_options.add_argument('--no-zygote')
    chrome_options.add_argument('--single-process')
    chrome_options.add_argument('--user-data-dir=/tmp/chrome-user-data')
    chrome_options.add_argument('--remote-debugging-pipe')
    chrome_options.binary_location = '/opt/chrome/chrome'
    
    service = Service(
        executable_path='/opt/chromedriver/chromedriver',
        service_args=['--verbose', '--log-path=/tmp/chromedriver.log']
    )
    
    return webdriver.Chrome(service=service, options=chrome_options)

def scrape_amazon(keyword: str, max_pages: int = 3) -> List[Dict[str, Any]]:
    """Amazonから商品情報をスクレイピング"""
    driver = get_chrome_driver()
    products = []
    
    try:
        base_url = "https://www.amazon.co.jp"
        search_url = f"{base_url}/s?k={keyword}"
        
        for page in range(1, max_pages + 1):
            if page > 1:
                search_url = f"{base_url}/s?k={keyword}&page={page}"
            
            driver.get(search_url)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-component-type="s-search-result"]'))
            )
            
            items = driver.find_elements(By.CSS_SELECTOR, '[data-component-type="s-search-result"]')
            
            for item in items[:10]:  # 各ページ最大10商品
                try:
                    # タイトル
                    title_elem = item.find_element(By.CSS_SELECTOR, 'h2 a span')
                    title = title_elem.text
                    
                    # URL
                    url_elem = item.find_element(By.CSS_SELECTOR, 'h2 a')
                    url = url_elem.get_attribute('href')
                    if not url.startswith('http'):
                        url = base_url + url
                    
                    # 価格
                    try:
                        price_elem = item.find_element(By.CSS_SELECTOR, 'span.a-price-whole')
                        price_text = price_elem.text.replace(',', '').replace('￥', '')
                        price = int(price_text)
                    except:
                        price = None
                    
                    # 画像
                    try:
                        img_elem = item.find_element(By.CSS_SELECTOR, 'img.s-image')
                        image_url = img_elem.get_attribute('src')
                    except:
                        image_url = None
                    
                    # レビュー数
                    try:
                        review_elem = item.find_element(By.CSS_SELECTOR, 'span.a-size-base.s-underline-text')
                        review_count = int(review_elem.text.replace(',', ''))
                    except:
                        review_count = 0
                    
                    # 評価
                    try:
                        rating_elem = item.find_element(By.CSS_SELECTOR, 'span.a-icon-alt')
                        rating_text = rating_elem.get_attribute('textContent')
                        rating = float(rating_text.split(' ')[0])
                    except:
                        rating = None
                    
                    products.append({
                        'title': title,
                        'url': url,
                        'price': price,
                        'image_url': image_url,
                        'review_count': review_count,
                        'rating': rating,
                        'scraped_at': datetime.now().isoformat()
                    })
                    
                except Exception as e:
                    print(f"商品解析エラー: {e}")
                    continue
            
    finally:
        driver.quit()
    
    return products

def parse_products_with_ai(products: List[Dict], product_type: str) -> List[Dict]:
    """OpenAI APIで商品情報を解析"""
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    
    if not openai_api_key:
        print("OpenAI API key not found")
        return []
    
    # プロンプトの設定（商品タイプに応じて変更）
    if product_type == 'toilet_paper':
        prompt = """
        以下のトイレットペーパー商品から必要な情報を抽出してください。
        各商品について以下の情報を抽出:
        - rolls: ロール数
        - sheets_per_roll: 1ロールあたりのシート数
        - ply: 層数（シングル=1、ダブル=2）
        - length_per_roll: 1ロールの長さ（メートル）
        - unit_price: 1ロールあたりの価格
        """
    else:  # dishwashing_liquid
        prompt = """
        以下の食器用洗剤商品情報から、正確な情報を抽出してください。
        各商品について以下の情報をJSON形式で返してください：
        - volume_ml: 容量（ミリリットル単位、数値のみ）
        - is_refill: 詰め替え用かどうか（true/false）
        - is_dishwasher: 食洗機用かどうか（true/false）
        
        重要な注意事項：
        1. 容量の解釈：
           - 「400ml」→ volume_ml: 400
           - 「1.5L」→ volume_ml: 1500
           - まとめ買いの場合は総容量を返す（例：「950ml×3個」→ volume_ml: 2850）
           - タブレット・キューブ・粉末の個数は容量として扱わない（例：「60個」→ volume_ml: null）
        
        2. 詰め替え判定：
           - 「詰め替え」「詰替」「つめかえ」「レフィル」→ is_refill: true
           - 「本体」「ボトル」または詰め替えの記載がない→ is_refill: false
        
        3. 食洗機用判定：
           タイトルに以下のいずれかが含まれていたら必ず is_dishwasher: true：
           - 「食洗機」「食洗器」「食器洗い機」「食器洗い乾燥機」
           - 「dishwasher」「DISHWASHER」
           - 「タブレット」「キューブ」「ジェルタブ」「パワーボール」
           - 「フィニッシュ」「Finish」「FINISH」
        """
    
    headers = {
        'Authorization': f'Bearer {openai_api_key}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'model': 'gpt-3.5-turbo',
        'messages': [
            {'role': 'system', 'content': prompt},
            {'role': 'user', 'content': json.dumps(products, ensure_ascii=False)}
        ],
        'temperature': 0.3
    }
    
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        parsed_data = json.loads(result['choices'][0]['message']['content'])
        return parsed_data
    else:
        print(f"OpenAI API error: {response.status_code}")
        return []

def save_to_supabase(products: List[Dict], table_name: str):
    """Supabaseにデータを保存"""
    supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("Supabase credentials not found")
        return
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # 既存データを削除
    delete_response = requests.delete(
        f"{supabase_url}/rest/v1/{table_name}?truncate=true",
        headers=headers
    )
    
    if delete_response.status_code not in [200, 204]:
        print(f"Failed to delete old data: {delete_response.status_code}")
        return
    
    # 新規データを挿入
    insert_response = requests.post(
        f"{supabase_url}/rest/v1/{table_name}",
        headers=headers,
        json=products
    )
    
    if insert_response.status_code in [200, 201]:
        print(f"Successfully saved {len(products)} products to {table_name}")
    else:
        print(f"Failed to insert data: {insert_response.status_code}")

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        # 認証トークンのチェック（EventBridge以外からの呼び出し時）
        if event.get('force_scrape'):
            expected_token = os.environ.get('SCRAPE_AUTH_TOKEN')
            provided_token = event.get('scrape_token')
            
            if expected_token and provided_token != expected_token:
                return {
                    'statusCode': 401,
                    'body': json.dumps({'error': 'Invalid scrape token'})
                }
            elif not expected_token:
                print("Warning: SCRAPE_AUTH_TOKEN not set, authentication disabled")
        
        # イベントから商品タイプを取得（デフォルトは両方）
        product_types = event.get('product_types', ['toilet_paper', 'dishwashing_liquid'])
        
        results = {}
        
        for product_type in product_types:
            if product_type == 'toilet_paper':
                keyword = 'トイレットペーパー'
                table_name = 'toilet_paper_products'
            elif product_type == 'dishwashing_liquid':
                keyword = '食器用洗剤'
                table_name = 'dishwashing_liquid_products'
            else:
                continue
            
            print(f"Scraping {product_type}...")
            
            # スクレイピング実行
            raw_products = scrape_amazon(keyword)
            
            # AI解析
            parsed_products = parse_products_with_ai(raw_products, product_type)
            
            # Supabaseに保存
            save_to_supabase(parsed_products, table_name)
            
            results[product_type] = {
                'scraped': len(raw_products),
                'parsed': len(parsed_products),
                'status': 'success'
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps(results)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }