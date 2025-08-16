import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '食器用洗剤価格比較',
  description: 'Amazon内の食器用洗剤を1000ml単価で比較。詰め替え用のお得度も一目瞭然。',
}

export default function DishwashingLiquidLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}