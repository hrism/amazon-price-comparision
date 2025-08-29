import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '米価格比較',
  description: 'Amazonで販売されている米の1kgあたりの価格を比較。銘柄別・産地別に最安値商品を簡単に見つけられます。',
  keywords: ['米', '価格比較', 'Amazon', '最安値', 'コシヒカリ', 'あきたこまち', '単価計算'],
  openGraph: {
    title: '米価格比較 | 安く買う.com',
    description: 'Amazonで販売されている米の1kgあたりの価格を比較。銘柄別・産地別に最安値商品を簡単に見つけられます。',
    url: 'https://www.yasu-ku-kau.com/rice',
    images: [
      {
        url: '/ogp_rice.png',
        width: 1200,
        height: 630,
        alt: '米価格比較',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '米価格比較 | 安く買う.com',
    description: 'Amazonで販売されている米の1kgあたりの価格を比較',
    images: ['/ogp_rice.png'],
  },
};