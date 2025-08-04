# トイレットペーパー価格比較サイト 要件定義・設計仕様書（セール情報対応版）

## 1. プロジェクト概要

Amazon内で販売されるトイレットペーパーを対象に、
 **1ロール単価・1m単価・レビュー点数・セール情報**を用いた価格比較が可能なWebサービスを構築する。

- Amazon Product Advertising API（PA-API）を利用して商品情報を取得
- 検索キーワードから商品情報を収集し、Supabaseにキャッシュ
- タイトル・説明文から自然言語処理で数量を抽出し単価計算
- シングル／ダブルでのフィルタリング可能
- セール価格がある場合は通常価格・割引率を表示

------

## 2. 対象範囲

### 2.1 対象商品

- トイレットペーパー（シングル／ダブル問わず）
- Amazon.co.jpで販売される商品
- Amazon Product Advertising API（PA-API v5）で取得可能な商品

### 2.2 除外商品

- 明確にトイレットペーパーでない商品（ギフトセット・オムツ等）
- 価格情報が取得できない商品
- 在庫なし商品

------

## 3. 取得データ要件（PA-API）

| 項目                 | 必須 | 備考                               |
| -------------------- | ---- | ---------------------------------- |
| ASIN                 | ○    | 一意識別子                         |
| 商品タイトル         | ○    | ItemInfo.Title                     |
| 商品説明             | ○    | ItemInfo.Features or ContentInfo   |
| ブランド名           | 任意 | ItemInfo.ByLineInfo                |
| 商品画像URL          | ○    | Images.Primary.Large               |
| 通常価格（割引前）   | ○    | Offers.Listings.SavingBasis.Amount |
| 販売価格（割引後）   | ○    | Offers.Listings.Price.Amount       |
| 割引率（％）         | ○    | Offers.Listings.PercentageSaved    |
| セール中判定         | ○    | SavingBasisありかつPrice<通常価格  |
| レビュー平均点（星） | ○    | CustomerReviews.StarRating         |
| レビュー件数         | ○    | CustomerReviews.Count              |



------

## 4. 単価算出・セール判定ロジック

### 4.1 自然言語処理による数量抽出

1. **テキスト正規化**

   - 全角/半角統一
   - 「×」「x」「X」「✕」を「×」に統一
   - 「巻」「ロール」「個入」を「ロール」に統一
   - 単位をmに統一

2. **形態素解析・数量抽出**

   - `SudachiPy`または`spaCy+GiNZA`で「数値＋単位」を抽出
   - 候補：`50m`, `12ロール`, `3パック` 等

3. **総ロール数計算**

   - `(ロール × パック)` 優先
   - 単独ロール表記も対応（例：30巻 → 30）

4. **総メートル数計算**

   ```
   ini
   
   
   CopyEdit
   total_length_m = roll_count × length_m
   ```

5. **単価計算**

   ```
   CopyEdit
   1ロール単価 = 販売価格 ÷ roll_count
   1m単価     = 販売価格 ÷ total_length_m
   ```

6. **シングル／ダブル判定**

   - タイトル・説明文に「ダブル」「シングル」があれば設定
   - 結果表示時にフィルタ可能

7. **セール判定**

   - `SavingBasis.Amount` が存在かつ `Price.Amount` < `SavingBasis.Amount` ならセール中
   - 割引率は `PercentageSaved` を使用（なければ計算）

------

### 4.2 抽出例

商品タイトル：

```
CopyEdit
スコッティ フラワーパック 3倍長持ち トイレット12ロール 75mダブル ×4パック
```

抽出結果：

- 長さ: 75 m
- 総ロール: 12 × 4 = 48
- 総メートル: 3,600 m
- 単価: 販売価格 ÷ 48ロール
- シングル/ダブル: ダブル
- セール中かどうか: SavingBasisありで価格差ありならtrue

------

## 5. データベース設計（Supabase）

```
sql


CopyEdit
create table products (
    id uuid primary key default gen_random_uuid(),
    asin text not null unique,
    title text not null,
    description text,
    brand text,
    image_url text,
    price integer,                -- 販売価格（セール適用後）
    price_regular integer,        -- 通常価格（割引前）
    discount_percent integer,     -- 割引率
    on_sale boolean,              -- セール中フラグ
    review_avg numeric(2,1),
    review_count integer,
    roll_count integer,
    length_m numeric(5,1),
    total_length_m numeric(7,1),
    price_per_roll numeric(7,2),
    price_per_m numeric(7,3),
    is_double boolean,
    last_fetched_at timestamp default now()
);
```

------

## 6. API設計（Next.js API Routes）

### `/api/search`（GET）

**クエリ**

- `keyword` (string, 必須)
- `filter` (optional: `single` / `double` / `sale`)

**レスポンス例**

```
json


CopyEdit
[
  {
    "asin": "B0XXXXXX",
    "title": "エリエール i:na 2倍巻き 50m×36ロール ダブル",
    "price": 3980,
    "price_regular": 4980,
    "discount_percent": 20,
    "on_sale": true,
    "review_avg": 4.5,
    "review_count": 1234,
    "roll_count": 36,
    "length_m": 50,
    "total_length_m": 1800,
    "price_per_roll": 110.56,
    "price_per_m": 2.21,
    "is_double": true,
    "image_url": "https://..."
  }
]
```

------

## 7. フロントエンド仕様（Next.js）

- `/`
  - キーワード検索フォーム
  - 最近検索した商品の一覧（キャッシュ）
- `/compare?keyword=トイレットペーパー`
  - 結果テーブル
    - 画像 / タイトル / 価格 / 通常価格 / 割引率 / 単価 / 星評価
    - **セール中商品は価格を強調表示**
  - ソート：`price_per_m`、`price_per_roll`、`discount_percent`
  - フィルタ：`is_double`、`on_sale`

------

## 8. 運用・更新

- **価格更新**：1日1回以上、Supabaseに反映
- **API制限対応**：初回はキャッシュ優先
- **古い商品**：一定期間アクセスなしなら無効化