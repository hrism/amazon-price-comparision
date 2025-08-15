export function getAmazonProductUrl(asin: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22';
  return `https://www.amazon.co.jp/dp/${asin}?tag=${tag}&language=ja_JP&currency=JPY`;
}