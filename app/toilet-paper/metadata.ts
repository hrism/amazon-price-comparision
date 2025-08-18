import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'トイレットペーパー価格比較',
  description: 'Amazonで販売されているトイレットペーパーの1ロール・1メートルあたりの価格を比較。シングル・ダブル別に最安値商品を簡単に見つけられます。',
  keywords: ['トイレットペーパー', '価格比較', 'Amazon', '最安値', 'シングル', 'ダブル', '単価計算'],
  openGraph: {
    title: 'トイレットペーパー価格比較 | 安く買う.com',
    description: 'Amazonで販売されているトイレットペーパーの1ロール・1メートルあたりの価格を比較。シングル・ダブル別に最安値商品を簡単に見つけられます。',
    url: 'https://www.yasu-ku-kau.com/toilet-paper',
    images: [
      {
        url: '/ogp_toilet-paper.png',
        width: 1200,
        height: 630,
        alt: 'トイレットペーパー価格比較',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'トイレットペーパー価格比較 | 安く買う.com',
    description: 'Amazonで販売されているトイレットペーパーの1ロール・1メートルあたりの価格を比較',
    images: ['/ogp_toilet-paper.png'],
  },
};