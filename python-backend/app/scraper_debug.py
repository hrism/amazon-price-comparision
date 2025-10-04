import undetected_chromedriver as uc
from bs4 import BeautifulSoup
import time
import asyncio
from typing import List, Dict, Any
import os

class AmazonScraperDebug:
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
            # より一般的なUser-Agentを設定
            options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            options.add_experimental_option("prefs", {
                "intl.accept_languages": "ja,ja-JP"
            })
            
            self.driver = uc.Chrome(options=options, version_main=141)
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
        print(f"[DEBUG] Navigating to: {url}")
        
        try:
            self.driver.get(url)
            print(f"[DEBUG] Page title: {self.driver.title}")
            print(f"[DEBUG] Current URL: {self.driver.current_url}")
            time.sleep(3)  # ページ読み込み待機
            
            # スクリーンショットを保存（デバッグ用）
            if os.environ.get('GITHUB_ACTIONS'):
                self.driver.save_screenshot('/tmp/amazon_page.png')
                print("[DEBUG] Screenshot saved to /tmp/amazon_page.png")
            
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
            
            if "申し訳ございません" in page_source:
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
            
            return len(search_results)  # テスト用に商品数だけ返す
            
        except Exception as e:
            print(f"[ERROR] Scraping failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return 0
    
    async def close(self):
        if self.driver:
            self.driver.quit()

# テスト実行
if __name__ == "__main__":
    async def test():
        scraper = AmazonScraperDebug()
        try:
            count = await scraper.search_products("トイレットペーパー")
            print(f"[RESULT] Found {count} products")
        finally:
            await scraper.close()
    
    asyncio.run(test())