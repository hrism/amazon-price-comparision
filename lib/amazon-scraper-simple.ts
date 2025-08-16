import axios from 'axios';

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

class AmazonScraperSimple {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  async searchProducts(keyword: string): Promise<ScrapedProduct[]> {
    // デモ用のトイレットペーパー商品データを生成
    const productCount = 20; // 20件の商品を生成
    const products: ScrapedProduct[] = [];

    for (let i = 0; i < productCount; i++) {
      const asin = `B0${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      try {
        // デモ用のダミーデータを生成
        // 価格を1000円〜5000円の範囲で生成
        const basePrice = Math.floor(Math.random() * 4000) + 1000;
        const hasDiscount = Math.random() > 0.6; // 40%の確率で割引
        
        const dummyProduct: ScrapedProduct = {
          asin: asin,
          title: this.generateDummyTitle(i),
          price: basePrice,
          priceRegular: hasDiscount ? Math.floor(basePrice * (1.1 + Math.random() * 0.3)) : basePrice,
          discountPercent: 0,
          onSale: hasDiscount,
          reviewAvg: Number((3.5 + Math.random() * 1.5).toFixed(1)),
          reviewCount: Math.floor(Math.random() * 2000) + 100,
          imageUrl: `https://m.media-amazon.com/images/I/71${Math.floor(Math.random() * 900) + 100}example.jpg`,
          brand: this.generateDummyBrand(),
          description: 'トイレットペーパー ダブル 12ロール'
        };

        // セール判定
        dummyProduct.onSale = dummyProduct.priceRegular! > dummyProduct.price!;
        if (dummyProduct.onSale && dummyProduct.priceRegular) {
          dummyProduct.discountPercent = Math.floor(((dummyProduct.priceRegular - dummyProduct.price!) / dummyProduct.priceRegular) * 100);
        }

        products.push(dummyProduct);

        // レート制限のための待機
        await this.delay(100);
      } catch (error) {
        console.error(`Error fetching ASIN ${asin}:`, error);
      }
    }

    return products;
  }

  private generateDummyTitle(index: number): string {
    const brands = ['エリエール', 'スコッティ', 'ネピア', 'クリネックス', 'エルモア'];
    const types = ['トイレットティッシュ', 'トイレットペーパー', 'フラワーパック'];
    const features = ['2倍巻き', '3倍長持ち', '消臭プラス', 'やわらかタイプ'];
    const rolls = ['12ロール', '18ロール', '24ロール', '8ロール×3パック'];
    const lengths = ['50m', '75m', '100m', '25m'];
    
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const feature = features[Math.floor(Math.random() * features.length)];
    const roll = rolls[Math.floor(Math.random() * rolls.length)];
    const length = lengths[Math.floor(Math.random() * lengths.length)];
    
    return `${brand} ${type} ${feature} ${roll} ${length} ダブル`;
  }

  private generateDummyBrand(): string {
    const brands = ['エリエール', 'スコッティ', 'ネピア', 'クリネックス', 'エルモア'];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    // HTTPクライアントなので特に閉じる必要なし
  }
}

export default AmazonScraperSimple;