# API仕様書

## /api/products

商品データを取得する統一APIエンドポイント。

### リクエスト
- Method: GET
- Parameters:
  - `type`: 商品タイプ（必須）
    - `toilet_paper` - トイレットペーパー
    - `dishwashing_liquid` - 食器用洗剤
    - `mineral_water` - ミネラルウォーター
  - `category`: `type`のエイリアス（後方互換性のため）
  - `keyword`: 検索キーワード（オプション）
  - `filter`: フィルタータイプ（オプション）

### レスポンス形式

**正しい形式（配列を直接返す）:**
```json
[
  {
    "asin": "B08TV9VDR7",
    "title": "商品名",
    "price": 1000,
    "price_per_liter": 50.5,
    // ... その他のフィールド
  },
  // ... 他の商品
]
```

**注意:** オブジェクト形式（`{products: [], last_updated: ""}`）は使用しない。
全ページが配列形式を期待しているため、統一して配列を返す。

### 各ページでの使用例

```javascript
// トイレットペーパー、食器用洗剤ページ
const response = await fetch(`/api/products?type=${productType}`);
const data = await response.json(); // 配列を直接受け取る
setProducts(data);

// ミネラルウォーターページも同様に修正が必要
```

## 商品タイプ別のデータ構造

### 共通フィールド
- `asin`: ASIN（Amazon Standard Identification Number）
- `title`: 商品名
- `description`: 商品説明
- `brand`: ブランド名
- `image_url`: 画像URL
- `price`: 現在価格
- `price_regular`: 通常価格
- `discount_percent`: 割引率
- `on_sale`: セール中フラグ
- `review_avg`: 平均レビュー評価
- `review_count`: レビュー数
- `last_fetched_at`: 最終取得日時
- `created_at`: 作成日時
- `updated_at`: 更新日時

### トイレットペーパー固有
- `length_per_roll`: 1ロールあたりの長さ（m）
- `roll_count`: ロール数
- `total_length`: 総長さ（m）
- `price_per_m`: メートルあたり価格

### 食器用洗剤固有
- `volume`: 容量（ml）
- `count`: 本数
- `total_volume`: 総容量（ml）
- `price_per_1000ml`: 1000mlあたり価格

### ミネラルウォーター固有
- `volume_ml`: 1本あたり容量（ml）
- `bottle_count`: 本数
- `total_volume_ml`: 総容量（ml）
- `price_per_liter`: 1リットルあたり価格