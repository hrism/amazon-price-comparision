import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: '安く買う.com - 日用品価格比較',
    template: '%s | 安く買う.com'
  },
  description: 'Amazon内で販売される日用品の単価を比較して、本当にお得な商品を見つけます',
  metadataBase: new URL('https://www.yasu-ku-kau.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '安く買う.com - 日用品価格比較',
    description: 'Amazon内で販売される日用品の単価を比較して、本当にお得な商品を見つけます',
    url: 'https://www.yasu-ku-kau.com',
    siteName: '安く買う.com',
    locale: 'ja_JP',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}