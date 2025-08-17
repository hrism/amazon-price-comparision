#!/usr/bin/env python3
"""
scraper.pyのsearch_products関数を修正するスクリプト
"""

import sys

# 修正されたsearch_products関数の内容
fixed_search_products = '''    async def search_products(self, keyword: str) -> List[Dict[str, Any]]:
        await self._enforce_rate_limit()
        self._init_driver()
        
        url = f"https://www.amazon.co.jp/s?k={keyword}&language=ja_JP"
        print(f"[DEBUG] Navigating to: {url}")
        
        try:
            self.driver.get(url)
            print(f"[DEBUG] Page title: {self.driver.title}")
            print(f"[DEBUG] Current URL: {self.driver.current_url}")
            time.sleep(3)  # ページ読み込み待機
            
            # スクリーンショットを保存（GitHub Actions環境でのみ）
            if os.environ.get('GITHUB_ACTIONS'):
                self.driver.save_screenshot('/tmp/amazon_search_page.png')
                print("[DEBUG] Screenshot saved to /tmp/amazon_search_page.png")
            
            # HTMLを解析
            page_source = self.driver.page_source
            print(f"[DEBUG] Page source length: {len(page_source)}")
            
            # CAPTCHAやエラーページのチェック
            if "認証が必要" in page_source or "captcha" in page_source.lower():
                print("[ERROR] CAPTCHA detected on Amazon")
                if os.environ.get('GITHUB_ACTIONS'):
                    # HTMLの一部を出力
                    print("[DEBUG] Page HTML (first 1000 chars):")
                    print(page_source[:1000])
                raise Exception("CAPTCHA detected - Amazon is blocking the request")
            
            if "申し訳ございません" in page_source or "ご迷惑をおかけしています" in page_source:
                print("[ERROR] Amazon error page detected")
                if os.environ.get('GITHUB_ACTIONS'):
                    # HTMLの一部を出力
                    print("[DEBUG] Page HTML (first 1000 chars):")
                    print(page_source[:1000])
                raise Exception("Amazon error page - request may be blocked")
            
            soup = BeautifulSoup(page_source, 'html.parser')
            products = []
            seen_asins = set()
            
            # 商品カードを探す
            search_results = soup.select('[data-component-type="s-search-result"]')
            print(f"[DEBUG] Found {len(search_results)} search result elements")
            
            # 商品がない場合、他のセレクタも試す
            if not search_results:
                print("[DEBUG] Trying alternative selectors...")
                search_results = soup.select('[data-asin]')
                print(f"[DEBUG] Found {len(search_results)} elements with data-asin")
            
            for item in search_results:
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
                
                # 商品説明を先に収集（定価取得で使用するため）
                description_parts = []
                # タイトル以外の全てのテキスト要素を収集
                for elem in item.select('.a-size-base, .a-size-base-plus, .a-size-mini, .s-feature-text, .a-color-secondary'):
                    text = elem.text.strip()
                    if text and text != product.get('title') and len(text) > 5:
                        description_parts.append(text)
                
                # 定価（複数のセレクタで試す）
                regular_price_elem = item.select_one('.a-text-price .a-offscreen')
                if not regular_price_elem:
                    regular_price_elem = item.select_one('.a-text-price')
                if not regular_price_elem:
                    # span.a-price.a-text-price.a-size-base の場合
                    regular_price_elem = item.select_one('span.a-price.a-text-price span.a-offscreen')
                
                if regular_price_elem:
                    regular_text = regular_price_elem.text.replace(',', '').replace('￥', '').replace('¥', '').strip()
                    try:
                        potential_regular = int(float(regular_text))
                        # 定価が現在価格より高い場合のみ設定
                        if potential_regular > product.get('price', 0):
                            product['price_regular'] = potential_regular
                    except:
                        pass
                
                # 定価が取得できない場合、descriptionから「参考:」価格を探す
                if not product.get('price_regular') and description_parts:
                    import re
                    for part in description_parts:
                        # 「参考: ￥490」のパターンを探す
                        match = re.search(r'参考[:：]?\\s*[￥¥]?([\\d,]+)', part)
                        if match:
                            try:
                                ref_price = int(match.group(1).replace(',', ''))
                                if ref_price > product.get('price', 0):  # 参考価格が現在価格より高い場合のみ
                                    product['price_regular'] = ref_price
                                    break
                            except:
                                pass
                
                # セール判定
                if product.get('price_regular') and product.get('price'):
                    # 定価が現在価格より高く、かつ妥当な範囲内の場合のみセール判定
                    price_ratio = product['price_regular'] / product['price']
                    if (product['price_regular'] > product['price'] and 
                        price_ratio > 1.05 and  # 5%以上の割引
                        price_ratio < 10):  # 10倍以上の差は異常値として除外
                        product['on_sale'] = True
                        product['discount_percent'] = int(
                            ((product['price_regular'] - product['price']) / product['price_regular']) * 100
                        )
                    else:
                        product['on_sale'] = False
                        # 異常な定価は削除
                        if price_ratio >= 10 or price_ratio < 0.1:
                            del product['price_regular']
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
                    match = re.search(r'(\\d+(?:,\\d+)*)', count_text)
                    if match:
                        try:
                            product['review_count'] = int(match.group(1).replace(',', ''))
                        except:
                            pass
                
                # 商品説明を辞書に追加
                if description_parts:
                    product['description'] = ' '.join(description_parts)
                
                products.append(product)
            
            print(f"[SUCCESS] Found {len(products)} products")
            return products
            
        except Exception as e:
            print(f"[ERROR] Scraping failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return []'''

# scraper.pyを読み込み
with open('app/scraper.py', 'r', encoding='utf-8') as f:
    content = f.read()

# search_products関数の開始位置を見つける
start_marker = "    async def search_products(self, keyword: str) -> List[Dict[str, Any]]:"
end_marker = "    async def get_product_detail(self, asin: str) -> Dict[str, Any]:"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("ERROR: search_products function not found")
    sys.exit(1)

if end_idx == -1:
    print("ERROR: get_product_detail function not found")
    sys.exit(1)

# 関数を置き換え
new_content = content[:start_idx] + fixed_search_products + "\n    \n" + content[end_idx:]

# ファイルに書き戻し
with open('app/scraper.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("scraper.py has been fixed successfully!")