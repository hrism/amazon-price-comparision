import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ホーム',
  description: 'Amazon商品を単価で比較して、本当にお得な商品を見つけましょう',
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}