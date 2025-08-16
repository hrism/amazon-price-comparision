export interface Category {
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
    title: 'ミネラルウォーター',
    description: '100mlあたりで比較。',
    href: '/water',
    icon: '🥤',
    available: false,
    stats: {
      products: '準備中',
      updated: '近日公開'
    }
  },
  {
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