import undetected_chromedriver as uc
from bs4 import BeautifulSoup
import time
import asyncio
from typing import List, Dict, Any

class AmazonScraper:
    def __init__(self):
        self.driver = None
        self.last_request_time = 0
        self.rate_limit_delay = 3  # 3秒間隔
        
    def _init_driver(self):
        if not self.driver:
            options = uc.ChromeOptions()
            options.add_argument('--headless=new')  # 新しいヘッドレスモード
            options.add_argument('--lang=ja-JP')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("prefs", {
                "intl.accept_languages": "ja,ja-JP"
            })
            
            self.driver = uc.Chrome(options=options)
            self.driver.implicitly_wait(10)
    
    async def _enforce_rate_limit(self):
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            wait_time = self.rate_limit_delay - time_since_last
            print(f"Rate limiting: waiting {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
        
        self.last_request_time = time.time()
    
    async def search_products(self, keyword: str) -> List[Dict[str, Any]]:
        await self._enforce_rate_limit()
        self._init_driver()
        
        url = f"https://www.amazon.co.jp/s?k={keyword}&language=ja_JP"
        print(f"Navigating to: {url}")
        
        self.driver.get(url)
        time.sleep(3)  # ページ読み込み待機
        
        # HTMLを解析
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        products = []
        seen_asins = set()
        
        # 商品カードを探す
        for item in soup.select('[data-component-type="s-search-result"]'):
            asin = item.get('data-asin')
            if not asin or asin in seen_asins:
                continue
            seen_asins.add(asin)
            
            product = {'asin': asin}
            
            # タイトル
            title_elem = item.select_one('h2 span')
            if not title_elem:
                title_elem = item.select_one('[data-cy="title-recipe"] span')
            if not title_elem:
                title_elem = item.select_one('.s-title-instructions-style span')
            if title_elem:
                product['title'] = title_elem.text.strip()
            
            # 価格
            price_elem = item.select_one('.a-price .a-offscreen')
            if not price_elem:
                price_elem = item.select_one('.a-price-whole')
            if price_elem:
                price_text = price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                try:
                    # 小数点がある場合は整数に変換
                    product['price'] = int(float(price_text))
                except:
                    pass
            
            # 定価
            regular_price_elem = item.select_one('.a-text-price .a-offscreen')
            if not regular_price_elem:
                regular_price_elem = item.select_one('.a-text-price')
            if regular_price_elem:
                regular_text = regular_price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                try:
                    product['price_regular'] = int(float(regular_text))
                except:
                    pass
            
            # セール判定
            if product.get('price_regular') and product.get('price'):
                # 正常な価格の場合のみセール判定を行う
                if product['price_regular'] > 100 and product['price_regular'] > product['price']:
                    product['on_sale'] = True
                    product['discount_percent'] = int(
                        ((product['price_regular'] - product['price']) / product['price_regular']) * 100
                    )
                else:
                    product['on_sale'] = False
            else:
                product['on_sale'] = False
            
            # 画像
            img_elem = item.select_one('.s-image')
            if img_elem:
                product['image_url'] = img_elem.get('src')
            
            # レビュー - 複数のセレクタを試す
            rating_elem = item.select_one('.a-icon-alt') or item.select_one('[data-cy="reviews-ratings-slot"] .a-icon-alt')
            if rating_elem:
                rating_text = rating_elem.text
                if '5つ星のうち' in rating_text:
                    try:
                        product['review_avg'] = float(rating_text.split('5つ星のうち')[1].strip())
                    except:
                        pass
            
            # レビュー件数 - 複数のセレクタを試す
            review_count_elem = (
                item.select_one('span[aria-label*="件の評価"]') or
                item.select_one('.s-link-style .s-underline-text') or
                item.select_one('[data-cy="reviews-ratings-slot"] span.a-size-base')
            )
            if review_count_elem:
                count_text = review_count_elem.text.replace(',', '').replace('(', '').replace(')', '').strip()
                # "1,234" や "1,234件の評価" のような形式に対応
                import re
                match = re.search(r'(\d+(?:,\d+)*)', count_text)
                if match:
                    try:
                        product['review_count'] = int(match.group(1).replace(',', ''))
                    except:
                        pass
            
            # 商品説明を収集（より多くの情報を取得）
            description_parts = []
            # タイトル以外の全てのテキスト要素を収集
            for elem in item.select('.a-size-base, .a-size-base-plus, .a-size-mini, .s-feature-text, .a-color-secondary'):
                text = elem.text.strip()
                if text and text != product.get('title') and len(text) > 5:
                    description_parts.append(text)
            
            if description_parts:
                product['description'] = ' '.join(description_parts)
            
            products.append(product)
        
        print(f"Found {len(products)} products")
        return products
    
    async def get_product_detail(self, asin: str) -> Dict[str, Any]:
        """商品詳細ページから追加情報を取得"""
        await self._enforce_rate_limit()
        self._init_driver()
        
        url = f"https://www.amazon.co.jp/dp/{asin}?language=ja_JP"
        print(f"Getting detail for ASIN {asin}")
        
        self.driver.get(url)
        time.sleep(2)  # ページ読み込み待機
        
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        # 商品の基本情報を取得
        detail_info = {}
        
        # タイトル
        title_elem = (
            soup.select_one('#productTitle') or 
            soup.select_one('.product-title') or
            soup.select_one('h1.a-size-large')
        )
        if title_elem:
            detail_info['title'] = title_elem.text.strip()
        
        # 価格
        price_elem = (
            soup.select_one('.a-price .a-offscreen') or 
            soup.select_one('.a-price-whole') or
            soup.select_one('#corePrice_feature_div .a-price .a-offscreen')
        )
        if price_elem:
            price_text = price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
            try:
                detail_info['price'] = int(float(price_text))
            except:
                pass
        
        # 定価
        regular_price_elem = soup.select_one('.a-text-price .a-offscreen')
        if regular_price_elem:
            regular_text = regular_price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
            try:
                detail_info['price_regular'] = int(float(regular_text))
            except:
                pass
        
        # セール判定
        if detail_info.get('price_regular') and detail_info.get('price'):
            if detail_info['price_regular'] > detail_info['price']:
                detail_info['on_sale'] = True
                detail_info['discount_percent'] = int(
                    ((detail_info['price_regular'] - detail_info['price']) / detail_info['price_regular']) * 100
                )
            else:
                detail_info['on_sale'] = False
        else:
            detail_info['on_sale'] = False
        
        # 画像
        img_elem = (
            soup.select_one('#landingImage') or 
            soup.select_one('.a-dynamic-image') or
            soup.select_one('#imgBlkFront')
        )
        if img_elem:
            detail_info['image_url'] = img_elem.get('src')
        
        # レビュー
        rating_elem = soup.select_one('.a-icon-alt')
        if rating_elem and '5つ星のうち' in rating_elem.text:
            try:
                detail_info['review_avg'] = float(rating_elem.text.split('5つ星のうち')[1].strip())
            except:
                pass
        
        # レビュー件数
        review_count_elem = soup.select_one('#acrCustomerReviewText')
        if review_count_elem:
            count_text = review_count_elem.text.replace(',', '').strip()
            import re
            match = re.search(r'(\d+(?:,\d+)*)', count_text)
            if match:
                try:
                    detail_info['review_count'] = int(match.group(1).replace(',', ''))
                except:
                    pass
        
        # ブランド
        brand_elem = soup.select_one('#bylineInfo')
        if brand_elem:
            detail_info['brand'] = brand_elem.text.strip()
        
        # productDescriptionセクション（商品紹介）
        product_description = soup.select_one('#productDescription')
        if product_description:
            description_text = product_description.text.strip()
            detail_info['description'] = description_text
        
        # aplusセクション（商品の説明）- カークランド商品などで使用
        aplus_section = soup.select_one('#aplus')
        if aplus_section:
            # テキストコンテンツを抽出（スクリプトやスタイルタグを除外）
            for script in aplus_section.find_all(['script', 'style']):
                script.decompose()
            aplus_text = aplus_section.text.strip()
            if aplus_text:
                # 既存のdescriptionに追加または新規作成
                if 'description' in detail_info:
                    detail_info['description'] += '\n\n' + aplus_text
                else:
                    detail_info['description'] = aplus_text
        
        # feature-bulletsセクション（商品の特徴）
        feature_bullets = soup.select('#feature-bullets .a-list-item')
        features = []
        for bullet in feature_bullets:
            text = bullet.text.strip()
            if text and not text.startswith('›'):
                features.append(text)
        
        if features:
            detail_info['features'] = ' '.join(features)
        
        # 商品の詳細情報テーブル
        detail_table = soup.select('.prodDetTable tr, #productDetails_detailBullets_sections1 tr')
        for row in detail_table:
            label = row.select_one('th, .prodDetSectionEntry')
            value = row.select_one('td, .prodDetAttrValue')
            if label and value:
                label_text = label.text.strip()
                value_text = value.text.strip()
                if '寸法' in label_text or 'サイズ' in label_text:
                    detail_info['dimensions'] = value_text
        
        print(f"Detail info for {asin}: {list(detail_info.keys())}")
        if 'description' in detail_info:
            print(f"Description preview: {detail_info['description'][:200]}...")
        
        return detail_info
    
    async def close(self):
        if self.driver:
            self.driver.quit()
            self.driver = None