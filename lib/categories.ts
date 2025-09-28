export interface Category {
  id: string;
  name: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  available: boolean;
  stats: {
    products: string;
    updated: string;
  };
}

export const categories: Category[] = [
  {
    id: 'toilet-paper',
    name: 'トイレットペーパー',
    title: 'トイレットペーパー',
    description: '1m単価・1ロール単価で比較。2倍巻き・3倍巻きも正確に計算。',
    href: '/toilet-paper',
    icon: '🧻',
    available: true,
    stats: {
      products: '50+',
      updated: '毎日更新'
    }
  },
  {
    id: 'rice',
    name: '米',
    title: '米',
    description: '1kgあたりで比較。精米・無洗米を厳選。Amazon Fresh対応。',
    href: '/rice',
    icon: '🍚',
    available: true,
    stats: {
      products: '80+',
      updated: '毎日更新'
    }
  },
  {
    id: 'mineral-water',
    name: 'ミネラルウォーター',
    title: 'ミネラルウォーター',
    description: '1リットルあたりで比較。ケース買いでお得に。',
    href: '/mineral-water',
    icon: '💧',
    available: true,
    stats: {
      products: '40+',
      updated: '毎日更新'
    }
  },
  {
    id: 'dishwashing-liquid',
    name: '食器用洗剤',
    title: '食器用洗剤',
    description: '1000ml単価で比較。詰め替え用のお得度も一目瞭然。',
    href: '/dishwashing-liquid',
    icon: '🧽',
    available: true,
    stats: {
      products: '30+',
      updated: '毎日更新'
    }
  },
  {
    id: 'mask',
    name: 'マスク',
    title: 'マスク',
    description: '1枚単価で比較。大容量パックでお得に購入。',
    href: '/mask',
    icon: '😷',
    available: true,
    stats: {
      products: '40+',
      updated: '毎日更新'
    }
  },
  {
    id: 'tissue',
    name: 'ティッシュペーパー',
    title: 'ティッシュペーパー',
    description: '1枚単価で比較。箱ティッシュ・ポケットティッシュ対応。',
    href: '/tissue',
    icon: '🤧',
    available: false,
    stats: {
      products: '準備中',
      updated: '近日公開'
    }
  },
  {
    id: 'kitchen-paper',
    name: 'キッチンペーパー',
    title: 'キッチンペーパー',
    description: '1枚単価・吸収力で比較。ロール型・シート型対応。',
    href: '/kitchen-paper',
    icon: '🧻',
    available: false,
    stats: {
      products: '準備中',
      updated: '近日公開'
    }
  },
  {
    id: 'shampoo',
    name: 'シャンプー・ボディソープ',
    title: 'シャンプー・ボディソープ',
    description: '1ml単価で比較。詰め替え用のお得度も計算。',
    href: '/shampoo',
    icon: '🚿',
    available: false,
    stats: {
      products: '準備中',
      updated: '近日公開'
    }
  },
  {
    id: 'diaper',
    name: 'おむつ・生理用品',
    title: 'おむつ・生理用品',
    description: '1枚単価で比較。サイズ別・吸収力別に分類。',
    href: '/diaper',
    icon: '👶',
    available: false,
    stats: {
      products: '準備中',
      updated: '近日公開'
    }
  }
];