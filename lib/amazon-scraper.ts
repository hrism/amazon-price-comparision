import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Stealthプラグインを使用してボット検知を回避
puppeteer.use(StealthPlugin());

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

class AmazonScraper {
  private browser: any;
  private page: any;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  
  // レート制限設定
  private readonly RATE_LIMIT_DELAY = 3000; // 3秒間隔
  private readonly MAX_REQUESTS_PER_HOUR = 100;

  async initialize() {
    if (!this.isInitialized) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });
      this.page = await this.browser.newPage();
      
      // ユーザーエージェントを設定
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // ビューポートを設定
      await this.page.setViewport({ width: 1366, height: 768 });
      
      this.isInitialized = true;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
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
      
      // Amazon.co.jpで検索
      const searchUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&__mk_ja_JP=カタカナ`;
      console.log('Navigating to:', searchUrl);
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async (error: any) => {
        console.error('Navigation error:', error);
        // リトライロジック
        console.log('Retrying navigation...');
        await this.delay(5000);
        await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      });
      
      // 検索結果が読み込まれるのを待つ
      await this.page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 }).catch(() => {
        console.log('No search results found');
      });

      // ランダムな待機時間（1-3秒）
      await this.delay(1000 + Math.random() * 2000);

      // 商品情報を抽出
      const products = await this.page.evaluate(() => {
        const items: any[] = [];
        const searchResults = document.querySelectorAll('[data-component-type="s-search-result"]');
        
        searchResults.forEach((result: any) => {
          try {
            // ASIN
            const asin = result.getAttribute('data-asin');
            if (!asin) return;

            // タイトル
            const titleElement = result.querySelector('h2 a span');
            const title = titleElement ? titleElement.textContent?.trim() : '';

            // 価格情報
            const priceWholeElement = result.querySelector('.a-price-whole');
            const priceText = priceWholeElement ? priceWholeElement.textContent?.replace(/[^0-9]/g, '') : '';
            const price = priceText ? parseInt(priceText) : undefined;

            // 定価（取り消し線価格）
            const regularPriceElement = result.querySelector('.a-text-price .a-offscreen');
            const regularPriceText = regularPriceElement ? regularPriceElement.textContent?.replace(/[^0-9]/g, '') : '';
            const priceRegular = regularPriceText ? parseInt(regularPriceText) : undefined;

            // 割引率
            const discountElement = result.querySelector('.s-coupon-discount span');
            const discountText = discountElement ? discountElement.textContent : '';
            const discountMatch = discountText?.match(/(\d+)%/);
            const discountPercent = discountMatch ? parseInt(discountMatch[1]) : undefined;

            // セール判定
            const onSale = !!(priceRegular && price && priceRegular > price) || !!discountPercent;

            // レビュー情報
            const ratingElement = result.querySelector('.a-icon-star-small .a-icon-alt');
            const ratingText = ratingElement ? ratingElement.textContent : '';
            const ratingMatch = ratingText?.match(/5つ星のうち([\d.]+)/);
            const reviewAvg = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

            const reviewCountElement = result.querySelector('.s-link-style .s-underline-text');
            const reviewCountText = reviewCountElement ? reviewCountElement.textContent?.replace(/[^0-9]/g, '') : '';
            const reviewCount = reviewCountText ? parseInt(reviewCountText) : undefined;

            // 画像URL
            const imageElement = result.querySelector('.s-image');
            const imageUrl = imageElement ? imageElement.getAttribute('src') : undefined;

            // ブランド
            const brandElement = result.querySelector('.s-size-base-plus');
            const brand = brandElement && brandElement.textContent?.includes('ブランド') 
              ? brandElement.textContent.replace('ブランド: ', '') 
              : undefined;

            items.push({
              asin,
              title,
              price,
              priceRegular,
              discountPercent,
              onSale,
              reviewAvg,
              reviewCount,
              imageUrl,
              brand
            });
          } catch (error) {
            console.error('Error parsing product:', error);
          }
        });

        return items;
      });

      console.log(`Found ${products.length} products`);
      
      // デバッグ: 最初の商品を確認
      if (products.length > 0) {
        console.log('First product sample:', products[0]);
      }
      
      // トイレットペーパー関連の商品のみフィルタリング
      const toiletPaperProducts = products.filter(product => {
        if (!product.title) return false;
        const title = product.title;
        return title.includes('トイレ') || 
               title.includes('toilet') || 
               title.includes('ペーパー') ||
               title.includes('paper') ||
               title.includes('ティッシュ');
      });

      return toiletPaperProducts;

    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AmazonScraper;