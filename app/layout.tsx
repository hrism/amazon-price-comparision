import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { GoogleTagManager, GoogleTagManagerNoscript } from '@/components/GoogleTagManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: '安く買う.com - 日用品価格比較',
    template: '%s | 安く買う.com'
  },
  description: 'Amazon内で販売される日用品の単価を比較して、本当にお得な商品を見つけます。トイレットペーパーや食器用洗剤の1ロール・100mlあたりの価格を自動計算。',
  keywords: ['価格比較', '日用品', 'トイレットペーパー', '食器用洗剤', 'Amazon', '単価計算', '最安値'],
  authors: [{ name: '安く買う.com' }],
  creator: '安く買う.com',
  publisher: '安く買う.com',
  metadataBase: new URL('https://www.yasu-ku-kau.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: '安く買う.com - 日用品価格比較',
    description: 'Amazon内で販売される日用品の単価を比較して、本当にお得な商品を見つけます。トイレットペーパーや食器用洗剤の1ロール・100mlあたりの価格を自動計算。',
    url: 'https://www.yasu-ku-kau.com',
    siteName: '安く買う.com',
    images: [
      {
        url: '/ogp_top.png',
        width: 1200,
        height: 630,
        alt: '安く買う.com - 日用品価格比較',
      }
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '安く買う.com - 日用品価格比較',
    description: 'Amazon内で販売される日用品の単価を比較して、本当にお得な商品を見つけます',
    images: ['/ogp_top.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '', // Google Search Console verification code (if needed)
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <GoogleTagManager />
      </head>
      <body className={inter.className}>
        <GoogleTagManagerNoscript />
        {children}
      </body>
    </html>
  )
}