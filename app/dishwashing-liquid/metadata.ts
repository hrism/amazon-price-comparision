import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '食器用洗剤価格比較',
  description: 'Amazonで販売されている食器用洗剤の100mlあたりの価格を比較。詰め替え用・本体・食洗機用別に最安値商品を簡単に見つけられます。',
  keywords: ['食器用洗剤', '価格比較', 'Amazon', '最安値', '詰め替え', '食洗機用', '単価計算'],
  openGraph: {
    title: '食器用洗剤価格比較 | 安く買う.com',
    description: 'Amazonで販売されている食器用洗剤の100mlあたりの価格を比較。詰め替え用・本体・食洗機用別に最安値商品を簡単に見つけられます。',
    url: 'https://www.yasu-ku-kau.com/dishwashing-liquid',
    images: [
      {
        url: '/ogp_dishwashing.png',
        width: 1200,
        height: 630,
        alt: '食器用洗剤価格比較',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '食器用洗剤価格比較 | 安く買う.com',
    description: 'Amazonで販売されている食器用洗剤の100mlあたりの価格を比較',
    images: ['/ogp_dishwashing.png'],
  },
};