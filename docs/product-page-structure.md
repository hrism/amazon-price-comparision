# 商品ページ構成ガイド

## 概要
商品ページ（トイレットペーパー、食器用洗剤、ミネラルウォーター）の統一された構成とコンポーネントの使用方法。

## 基本構成

### ページ構造
```tsx
<main className="min-h-screen bg-white py-4">
  <div className="container mx-auto px-4">
    {/* 1. ヘッダー */}
    <ProductPageHeader />
    
    {/* 2. SNSシェアボタン */}
    <ShareButtons />
    
    {/* 3. ローディング中はスケルトンローダー */}
    {loading ? (
      <SkeletonLoader />
    ) : error ? (
      <ErrorDisplay />
    ) : (
      <ProductList />
    )}
    
    {/* 4. カテゴリ別ブログセクション */}
    <CategoryBlogSection />
    
    {/* 5. 他カテゴリへのリンク */}
    <CategoryGrid />
  </div>
</main>
```

## 使用コンポーネント

### 1. ProductPageHeader
商品ページの上部に表示されるヘッダー
- **場所**: `/components/ProductPageHeader.tsx`
- **Props**:
  - `title`: ページタイトル（例: "でトイレットペーパーを安く買う"）
  - `description`: ページの説明文
  - `tip`: 💡で表示されるワンポイントアドバイス

### 2. ShareButtons
SNSシェアボタン群
- **場所**: `/components/ShareButtons.tsx`
- **Props**:
  - `url`: シェアするURL
  - `title`: シェア時のタイトル
  - `description`: シェア時の説明文

### 3. SortSelector
ソート選択UI
- **場所**: `/components/SortSelector.tsx`
- **Props**:
  - `sortBy`: 現在のソート状態
  - `onSortChange`: ソート変更時のコールバック
  - `sortOptions`: ソートオプションの配列

### 4. ReviewFilter
レビューフィルター
- **場所**: `/components/ReviewFilter.tsx`
- **Props**:
  - `minScore`: 最小評価スコア
  - `onScoreChange`: スコア変更時のコールバック

### 5. ProductCard
個別商品カード
- **場所**: `/components/ProductCard.tsx`
- **Props**: 商品データオブジェクト

### 6. CategoryBlogSection
カテゴリ別のブログ記事セクション
- **場所**: `/components/CategoryBlogSection.tsx`
- **Props**:
  - `categorySlug`: カテゴリのスラグ

### 7. CategoryGrid
他カテゴリへのグリッドリンク
- **場所**: `/components/CategoryGrid.tsx`
- **Props**:
  - `currentCategory`: 現在のカテゴリ（ハイライト表示用）

## ローディング表示

### スケルトンローダー
**重要**: すべての商品ページで統一してスケルトンローダーを使用する。「読み込み中...」などのテキスト表示は使用しない。

```tsx
{loading ? (
  <div className="space-y-3">
    {[...Array(6)].map((_, index) => (
      <div key={index} className="bg-white border border-[#D5D9D9] rounded-2xl p-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <div className="w-full max-w-[150px] h-[150px] mx-auto bg-gray-200 rounded"></div>
          </div>
          <div className="md:col-span-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="flex gap-2">
              <div className="h-5 bg-gray-200 rounded w-16"></div>
              <div className="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
              <div>
                <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-9 bg-gray-200 rounded-2xl w-32"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
) : (
  // 実際のコンテンツ
)}
```

### エラー表示
エラー時は統一されたスタイルで表示：
```tsx
{error ? (
  <div className="flex items-center justify-center py-20">
    <div className="text-[16px] text-[#B12704]">{productLabels.status.error}: {error}</div>
  </div>
) : (
  // 実際のコンテンツ
)}
```

## データ取得パターン

### 基本的な流れ
1. `useEffect`でコンポーネントマウント時にデータ取得
2. ローディング中はスケルトンローダー表示
3. エラー時はエラーメッセージ表示
4. 成功時は商品リスト表示

```tsx
useEffect(() => {
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products);
      setLastUpdateTime(data.lastUpdate);
    } catch (err) {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  fetchProducts();
}, []);
```

## スタイリング規則

### カラー
- 背景: `bg-white`
- ボーダー: `border-[#D5D9D9]`
- テキスト（メイン）: `text-[#0F1111]`
- テキスト（サブ）: `text-[#565959]`
- エラー: `text-[#B12704]`
- セール: `bg-[#CC0C39]`

### レイアウト
- コンテナ: `container mx-auto px-4`
- カード: `bg-white border border-[#D5D9D9] rounded-2xl p-4`
- グリッド: `grid grid-cols-1 md:grid-cols-12 gap-4`

## 商品表示ルール

### 表示件数
- **TOP30のみ表示**: 各商品ページでは最大30件の商品を表示
- アコーディオンや「もっと見る」機能は不要
```tsx
{sortedProducts.slice(0, 30).map((product, index) => {
  // 商品カード表示
})}
```

### ランキングバッジ
**1位・2位・3位表示**: ソート順で上位3件には順位バッジを表示
- 表示条件: 単価順または総合評価順でソートされている場合のみ
- ProductCardコンポーネントが自動判定して表示
- 対応するソートキー:
  - `price_per_m` (トイレットペーパー)
  - `price_per_1000ml` (食器用洗剤)
  - `price_per_liter` (ミネラルウォーター)
  - `total_score` (総合評価)

## 新規商品ページ追加時のチェックリスト

- [ ] トイレットペーパーページの構成を参考にする
- [ ] スケルトンローダーを使用（テキストローディング表示は使わない）
- [ ] ProductPageHeaderコンポーネントを使用
- [ ] ShareButtonsコンポーネントを配置
- [ ] CategoryBlogSectionを追加
- [ ] CategoryGridで他カテゴリへのリンクを表示
- [ ] エラー処理を統一スタイルで実装
- [ ] レスポンシブデザインを確認
- [ ] 単価計算ロジックを実装（商品タイプに応じて）
- [ ] TOP30制限を実装 (`.slice(0, 30)`)
- [ ] ランキングバッジ用のソートキーをProductCardに対応させる