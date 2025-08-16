import type { Browser, Page } from 'puppeteer';

interface ScrapedProduct {
  asin: string;
  title: string;
  price?: number;
  priceRegular?: number;
  discountPercent?: number;
  onSale: boolean;
  reviewAvg?: number;
  reviewCount?: number;
  imageUrl?: string;
  brand?: string;
  description?: string;
}

class AmazonScraperServer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  
  // レート制限設定
  private readonly RATE_LIMIT_DELAY = 3000; // 3秒間隔
  private readonly MAX_REQUESTS_PER_HOUR = 100;

  async initialize() {
    if (!this.isInitialized) {
      // Dynamic import for server-side only
      const puppeteer = await import('puppeteer');
      
      this.browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });
      this.page = await this.browser.newPage();
      
      // ユーザーエージェントを設定
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // ビューポートを設定
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // JavaScriptを有効にする
      await this.page.setJavaScriptEnabled(true);
      
      // 言語設定を日本語に
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'ja-JP,ja;q=0.9'
      });
      
      this.isInitialized = true;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
    }
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms...`);
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    if (this.requestCount > this.MAX_REQUESTS_PER_HOUR) {
      throw new Error('Hourly request limit exceeded');
    }
  }

  async searchProducts(keyword: string): Promise<ScrapedProduct[]> {
    try {
      await this.enforceRateLimit();
      await this.initialize();
      
      if (!this.page) throw new Error('Page not initialized');
      
      // Amazon.co.jpで検索（日本語優先）
      const searchUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&language=ja_JP`;
      console.log('Navigating to:', searchUrl);
      
      // より柔軟なナビゲーション設定
      try {
        await this.page.goto(searchUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
      } catch (error) {
        console.log('First navigation attempt failed, retrying with networkidle0...');
        await this.page.goto(searchUrl, { 
          waitUntil: 'networkidle0',
          timeout: 60000 
        });
      }

      // ページが完全に読み込まれるまで待機
      await this.delay(3000);

      // 商品情報を抽出（修正版）
      const products = await this.page.evaluate(() => {
        const items: any[] = [];
        
        // より一般的なセレクタを使用
        const productCards = document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item[data-asin]');
        
        productCards.forEach((card: any) => {
          try {
            // ASIN
            const asin = card.getAttribute('data-asin');
            if (!asin || asin === '' || asin.length < 10) return;

            // タイトル - 複数のセレクタを試す
            let title = '';
            const titleSelectors = [
              'h2 a span',
              'h2 span',
              '.s-size-base-plus',
              '.a-size-base-plus',
              '.s-link-style .a-text-normal',
              '[data-cy="title-recipe"] span'
            ];
            
            for (const selector of titleSelectors) {
              const titleEl = card.querySelector(selector);
              if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim();
                break;
              }
            }

            if (!title) return;

            // 価格 - 複数のセレクタを試す
            let price: number | undefined;
            const priceSelectors = [
              '.a-price-whole',
              '.a-price .a-offscreen',
              '.a-price-range .a-price-whole',
              '.s-price'
            ];
            
            for (const selector of priceSelectors) {
              const priceEl = card.querySelector(selector);
              if (priceEl && priceEl.textContent) {
                const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
                if (priceText) {
                  price = parseInt(priceText);
                  break;
                }
              }
            }

            // 画像
            let imageUrl: string | undefined;
            const imgSelectors = [
              '.s-image',
              '.s-product-image-container img',
              '[data-component-type="s-product-image"] img'
            ];
            
            for (const selector of imgSelectors) {
              const imgEl = card.querySelector(selector);
              if (imgEl) {
                imageUrl = imgEl.getAttribute('src') || undefined;
                break;
              }
            }

            // レビュー
            let reviewAvg: number | undefined;
            let reviewCount: number | undefined;
            
            const ratingEl = card.querySelector('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt');
            if (ratingEl && ratingEl.textContent) {
              const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
              if (match) reviewAvg = parseFloat(match[1]);
            }

            const reviewCountEl = card.querySelector('.a-size-base.s-underline-text, .a-size-small .a-size-base');
            if (reviewCountEl && reviewCountEl.textContent) {
              const countText = reviewCountEl.textContent.replace(/[^0-9]/g, '');
              if (countText) reviewCount = parseInt(countText);
            }

            // 商品説明を取得
            let description = '';
            const descriptionSelectors = [
              '.s-feature-text',
              '.a-size-base-plus',
              '.a-text-normal span'
            ];
            
            // タイトル以外のテキスト要素から説明を探す
            for (const selector of descriptionSelectors) {
              const elements = card.querySelectorAll(selector);
              elements.forEach((el: any) => {
                const text = el.textContent?.trim() || '';
                if (text && text !== title && (text.includes('m') || text.includes('ロール'))) {
                  description += text + ' ';
                }
              });
            }

            items.push({
              asin,
              title,
              price,
              imageUrl,
              reviewAvg,
              reviewCount,
              onSale: false,
              description: description.trim()
            });
          } catch (error) {
            console.error('Error parsing product:', error);
          }
        });

        return items;
      });

      console.log(`Found ${products.length} products`);
      
      // Debug: log first few product titles
      if (products.length > 0) {
        console.log('Sample product titles:');
        products.slice(0, 5).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.title}`);
        });
      }
      
      // Since we're already searching for "トイレットペーパー", return all products
      // The search query itself should filter relevant products
      return products;

    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AmazonScraperServer;