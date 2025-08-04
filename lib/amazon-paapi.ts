import crypto from 'crypto-js';
import axios from 'axios';

interface AmazonProduct {
  asin: string;
  title: string;
  description?: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
  priceRegular?: number;
  discountPercent?: number;
  onSale: boolean;
  reviewAvg?: number;
  reviewCount?: number;
}

class AmazonPAAPI {
  private accessKey: string;
  private secretKey: string;
  private partnerTag: string;
  private host: string;
  private region: string;

  constructor() {
    this.accessKey = process.env.AMAZON_ACCESS_KEY || '';
    this.secretKey = process.env.AMAZON_SECRET_KEY || '';
    this.partnerTag = process.env.AMAZON_PARTNER_TAG || 'toiletpaper-22';
    this.host = process.env.AMAZON_HOST || 'webservices.amazon.co.jp';
    this.region = process.env.AMAZON_REGION || 'us-west-2';
  }

  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): any {
    const kDate = crypto.HmacSHA256(dateStamp, 'AWS4' + key);
    const kRegion = crypto.HmacSHA256(regionName, kDate);
    const kService = crypto.HmacSHA256(serviceName, kRegion);
    const kSigning = crypto.HmacSHA256('aws4_request', kService);
    return kSigning;
  }

  private getAuthorizationHeader(
    amzDate: string,
    dateStamp: string,
    payload: string,
    canonicalHeaders: string,
    signedHeaders: string,
    canonicalUri: string,
    canonicalQuerystring: string = ''
  ): string {
    const method = 'POST';
    const service = 'ProductAdvertisingAPI';
    const canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\n' + signedHeaders + '\n' + crypto.SHA256(payload).toString();
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = dateStamp + '/' + this.region + '/' + service + '/' + 'aws4_request';
    const stringToSign = algorithm + '\n' + amzDate + '\n' + credentialScope + '\n' + crypto.SHA256(canonicalRequest).toString();
    
    const signingKey = this.getSignatureKey(this.secretKey, dateStamp, this.region, service);
    const signature = crypto.HmacSHA256(stringToSign, signingKey).toString();
    
    const authorizationHeader = algorithm + ' ' + 'Credential=' + this.accessKey + '/' + credentialScope + ', ' + 'SignedHeaders=' + signedHeaders + ', ' + 'Signature=' + signature;
    
    return authorizationHeader;
  }

  private lastRequestTime: number = 0;

  private async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // 最初のリクエストは2秒、その後は1秒間隔
    const requiredInterval = this.lastRequestTime === 0 ? 2000 : 1000;
    
    if (timeSinceLastRequest < requiredInterval) {
      const waitTime = requiredInterval - timeSinceLastRequest;
      console.log(`Waiting ${waitTime}ms for rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async searchItems(keywords: string): Promise<AmazonProduct[]> {
    await this.waitForRateLimit();
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const canonicalUri = '/paapi5/searchitems';
    const canonicalHeaders = 'content-encoding:amz-1.0\n' + 'content-type:application/json; charset=utf-8\n' + 'host:' + this.host + '\n' + 'x-amz-date:' + amzDate + '\n' + 'x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n';
    const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

    const payload = JSON.stringify({
      Keywords: keywords,
      PartnerTag: this.partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.co.jp",
      ItemCount: 20,
      Resources: [
        "ItemInfo.Title",
        "ItemInfo.Features",
        "ItemInfo.ManufactureInfo",
        "ItemInfo.ByLineInfo",
        "Images.Primary.Large",
        "Offers.Listings.Price",
        "Offers.Listings.SavingBasis",
        "Offers.Listings.Promotions",
        "CustomerReviews.StarRating",
        "CustomerReviews.Count"
      ]
    });

    const authorizationHeader = this.getAuthorizationHeader(
      amzDate,
      dateStamp,
      payload,
      canonicalHeaders,
      signedHeaders,
      canonicalUri
    );

    try {
      const response = await axios.post(
        `https://${this.host}${canonicalUri}`,
        payload,
        {
          headers: {
            'Authorization': authorizationHeader,
            'Content-Encoding': 'amz-1.0',
            'Content-Type': 'application/json; charset=utf-8',
            'Host': this.host,
            'X-Amz-Date': amzDate,
            'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
          }
        }
      );

      return this.parseSearchResults(response.data);
    } catch (error: any) {
      console.error('Amazon PA-API Error:', error);
      
      // 429エラーの場合、詳細なエラーメッセージを返す
      if (error.response?.status === 429) {
        throw new Error('Amazon APIのリクエスト制限に達しました。しばらく時間をおいてからお試しください。');
      }
      
      throw error;
    }
  }

  private parseSearchResults(data: any): AmazonProduct[] {
    if (!data.SearchResult || !data.SearchResult.Items) {
      return [];
    }

    return data.SearchResult.Items.map((item: any) => {
      const offers = item.Offers?.Listings?.[0];
      const price = offers?.Price?.Amount;
      const savingBasis = offers?.SavingBasis?.Amount;
      const percentageSaved = offers?.Price?.Savings?.Percentage;

      return {
        asin: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue || '',
        description: item.ItemInfo?.Features?.DisplayValues?.join(' ') || '',
        brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || item.ItemInfo?.ManufactureInfo?.Name?.DisplayValue,
        imageUrl: item.Images?.Primary?.Large?.URL,
        price: price ? Math.round(price * 100) : undefined,
        priceRegular: savingBasis ? Math.round(savingBasis * 100) : undefined,
        discountPercent: percentageSaved,
        onSale: savingBasis && price && savingBasis > price,
        reviewAvg: item.CustomerReviews?.StarRating?.Value,
        reviewCount: item.CustomerReviews?.Count
      };
    });
  }
}

export default AmazonPAAPI;