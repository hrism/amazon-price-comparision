// 全商品ページで使用する共通ラベル定義
export const productLabels = {
  // CTA（Call to Action）ボタン
  cta: {
    purchase: 'Amazonで購入する',
    viewOnAmazon: 'Amazonで見る',
    refetch: '再フェッチ',
    refetching: '更新中...',
    priceRefresh: '価格を再取得',
  },
  
  // 価格関連
  price: {
    label: '販売価格',
    unitPriceLabel: '単価',
  },
  
  // フィルター・ソート
  sort: {
    label: '並び替え',
  },
  filter: {
    label: 'フィルター',
    all: 'すべて',
    saleOnly: 'セール中のみ',
  },
  
  // 商品情報
  product: {
    brand: 'ブランド',
    review: 'レビュー',
    sale: 'セール中',
    discount: 'OFF',
    noImage: 'No Image',
  },
  
  // カテゴリー共通
  category: {
    otherCategories: '他のカテゴリーも見る',
    subtitle: '様々な日用品を単価比較して、賢くお買い物しましょう',
  },
  
  // ステータス
  status: {
    loading: '読み込み中...',
    error: 'エラー',
    productsCount: '件の商品',
    noProducts: '条件に一致する商品が見つかりませんでした',
  },
} as const;

// トイレットペーパー専用ラベル
export const toiletPaperLabels = {
  sort: {
    pricePerMeter: '1m単価（安い順）',
    pricePerRoll: '1ロール単価（安い順）',
    discountPercent: '割引率（高い順）',
  },
  filter: {
    singleOnly: 'シングルのみ',
    doubleOnly: 'ダブルのみ',
  },
  product: {
    single: 'シングル',
    double: 'ダブル',
    totalRolls: '総ロール数',
    rollLength: '1ロール',
    rolls: 'ロール',
    meter: 'm',
    perMeter: '/m',
    perRoll: '/ロール',
  },
} as const;

// 食器用洗剤専用ラベル
export const dishwashingLiquidLabels = {
  sort: {
    pricePerLiter: '1000ml単価（安い順）',
    price: '価格（安い順）',
    discountPercent: '割引率（高い順）',
  },
  filter: {
    refillOnly: '詰め替え用のみ',
    regularOnly: '本体のみ',
  },
  product: {
    refill: '詰め替え用',
    regular: '本体',
    volume: '容量',
    milliliter: 'ml',
    perLiter: '/L',
  },
} as const;

// ミネラルウォーター専用ラベル
export const mineralWaterLabels = {
  sort: {
    pricePerLiter: '1L単価（安い順）',
    price: '価格（安い順）',
    discountPercent: '割引率（高い順）',
  },
  filter: {
    caseOnly: 'ケース買い',
    bottleOnly: 'ボトル単品',
  },
  product: {
    case: 'ケース買い',
    bottle: 'ペットボトル',
    volume: '容量',
    totalVolume: '総容量',
    liter: 'L',
    perLiter: '/L',
  },
} as const;