import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ミネラルウォーター価格比較',
  description: 'Amazonで販売されているミネラルウォーターの1Lあたりの価格を比較。国産・輸入水・炭酸水別に最安値商品を簡単に見つけられます。',
  keywords: ['ミネラルウォーター', '価格比較', 'Amazon', '最安値', '天然水', '炭酸水', '単価計算'],
  openGraph: {
    title: 'ミネラルウォーター価格比較 | 安く買う.com',
    description: 'Amazonで販売されているミネラルウォーターの1Lあたりの価格を比較。国産・輸入水・炭酸水別に最安値商品を簡単に見つけられます。',
    url: 'https://www.yasu-ku-kau.com/mineral-water',
    images: [
      {
        url: '/ogp_mineral-water.png',
        width: 1200,
        height: 630,
        alt: 'ミネラルウォーター価格比較',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ミネラルウォーター価格比較 | 安く買う.com',
    description: 'Amazonで販売されているミネラルウォーターの1Lあたりの価格を比較',
    images: ['/ogp_mineral-water.png'],
  },
};