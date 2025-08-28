# 新商材追加ガイド

このドキュメントは、新しい商品タイプ（商材）をシステムに追加する際の汎用的な手順をまとめたものです。

## 概要

新商材を追加する際は、以下の3つの主要コンポーネントを実装する必要があります：

1. **バックエンド（Python）**: スクレイピングとデータ処理
2. **データベース（Supabase）**: データ保存
3. **フロントエンド（Next.js）**: 表示と検索

## 1. データベース設計

### 1.1 テーブル作成

Supabaseで新しいテーブルを作成します。命名規則: `{product_type}_products`

```sql
CREATE TABLE {product_type}_products (
  -- 共通フィールド
  id SERIAL PRIMARY KEY,
  asin VARCHAR(20) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  image_url TEXT,
  price INTEGER,
  price_regular INTEGER,
  discount_percent INTEGER,
  on_sale BOOLEAN DEFAULT false,
  review_avg NUMERIC(3,2),
  review_count INTEGER,
  
  -- 商品固有フィールド
  -- 例: トイレットペーパー
  -- roll_count INTEGER,
  -- length_m NUMERIC(10,2),
  -- is_double BOOLEAN,
  
  -- 例: 米
  -- weight_kg NUMERIC(10,2),
  -- rice_type VARCHAR(100),
  -- is_musenmai BOOLEAN,
  
  -- 単価フィールド（商品タイプに応じて変更）
  price_per_unit NUMERIC(10,2),  -- price_per_m, price_per_kg, price_per_literなど
  
  -- メタデータ
  total_score NUMERIC(4,2),
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_{product_type}_products_asin ON {product_type}_products(asin);
CREATE INDEX idx_{product_type}_products_price_per_unit ON {product_type}_products(price_per_unit);
CREATE INDEX idx_{product_type}_products_total_score ON {product_type}_products(total_score);
```

## 2. バックエンド実装（Python）

### 2.1 スクレイパー作成

#### ファイル構造
```
python-backend/app/scrapers/
├── {product_type}.py           # BaseScraper実装
├── {product_type}_scraper.py   # 実際のスクレイピングロジック（オプション）
└── registry.py                 # スクレイパー登録
```

#### 2.1.1 BaseScraper実装 (`{product_type}.py`)

```python
from .base import BaseScraper
from typing import List, Dict, Any, Optional
import time

class {ProductType}Scraper(BaseScraper):
    """商品タイプ用スクレイパー"""
    
    async def get_search_keyword(self) -> str:
        """検索キーワードを返す"""
        return "検索キーワード"
    
    async def get_existing_products(self) -> Dict[str, Any]:
        """既存商品を取得"""
        existing_dict = {}
        try:
            response = self.db.supabase.table('{product_type}_products').select('*').execute()
            if response.data:
                for product in response.data:
                    existing_dict[product['asin']] = product
        except Exception as e:
            print(f"Error fetching existing products: {e}")
        return existing_dict
    
    async def get_cached_products(self, filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """キャッシュされた商品を取得"""
        try:
            query = self.db.supabase.table('{product_type}_products').select('*')
            
            # フィルタリング実装
            if filter == 'specific_filter':
                query = query.eq('specific_field', True)
            
            # 単価でソート
            query = query.order('price_per_unit', desc=False)
            
            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching cached products: {e}")
            return []
    
    async def process_product(self, product: Dict[str, Any], existing_products: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """商品データを処理"""
        # 商品固有の処理を実装
        # GPTパーサーを使用する場合:
        # from ..services.gpt_parser import parse_{product_type}_info
        # extracted = parse_{product_type}_info(product['title'], product.get('description', ''))
        
        return product
    
    async def save_products(self, products: List[Dict[str, Any]]) -> None:
        """商品を保存"""
        if products:
            await self.db.save_{product_type}_products(products)
    
    async def scrape(self, force: bool = False, filter: Optional[str] = None) -> Dict[str, Any]:
        """スクレイピング実行"""
        # 基本実装はBaseScraperのものを使用するか、カスタマイズ
        return await super().scrape(force, filter)
```

#### 2.1.2 レジストリへの登録 (`registry.py`)

```python
from .{product_type} import {ProductType}Scraper

SCRAPER_REGISTRY: Dict[str, Type[BaseScraper]] = {
    # 既存のスクレイパー
    "toilet_paper": ToiletPaperScraper,
    "dishwashing_liquid": DishwashingScraper,
    "mineral_water": MineralWaterScraper,
    "rice": RiceScraper,
    # 新規追加
    "{product_type}": {ProductType}Scraper,
}
```

### 2.2 データベース保存メソッド追加

`python-backend/app/database.py`に追加：

```python
async def save_{product_type}_products(self, products: List[Dict[str, Any]]) -> None:
    """商品をデータベースに保存"""
    if not self.enabled or not products:
        return
        
    try:
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc).isoformat()
        
        for product in products:
            product['last_fetched_at'] = current_time
        
        response = self.supabase.table('{product_type}_products').upsert(
            products, 
            on_conflict='asin'
        ).execute()
        print(f"Saved {len(products)} {product_type} products to database")
        
    except Exception as e:
        print(f"Error saving {product_type} products: {str(e)}")
```

### 2.3 GPTパーサー追加（オプション）

商品情報の抽出にGPTを使用する場合：

`python-backend/app/prompts/{product_type}.py`:

```python
"""
商品情報抽出用プロンプト
"""

SYSTEM_PROMPT = """
あなたは{商品タイプ}商品の情報を分析する専門家です。
商品タイトルと説明文から以下の情報を正確に抽出してください：

1. field1: 説明
2. field2: 説明
...
"""

USER_PROMPT_TEMPLATE = """
以下の{商品タイプ}商品の情報を分析してください：

タイトル: {title}
説明: {description}

以下のJSON形式で情報を返してください：
{{
    "field1": value,
    "field2": value,
    ...
}}
"""
```

## 3. フロントエンド実装（Next.js）

### 3.1 APIエンドポイント作成

`app/api/{product-type}/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || 'デフォルトキーワード';
    const force = searchParams.get('force') === 'true';

    // forceの場合、Pythonバックエンドを呼び出し
    if (force) {
      // Python APIを呼び出す処理
    }

    // データベースから取得
    const { data, error } = await supabase
      .from('{product_type}_products')
      .select('*')
      .order('price_per_unit', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 });
    }

    return NextResponse.json({
      products: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
```

### 3.2 型定義

`app/types/{product-type}.ts`:

```typescript
export interface {ProductType}Product {
  // 共通フィールド
  id?: number;
  asin: string;
  title: string;
  description?: string;
  brand?: string;
  image_url?: string;
  price: number;
  price_regular?: number;
  discount_percent?: number;
  on_sale?: boolean;
  review_avg?: number;
  review_count?: number;
  
  // 商品固有フィールド
  // 例: specific_field?: type;
  
  // 単価
  price_per_unit?: number;
  
  // メタデータ
  total_score?: number;
  last_fetched_at?: string;
  created_at?: string;
  updated_at?: string;
}
```

### 3.3 表示ページ作成

`app/{product-type}/page.tsx`:

基本的な構造は既存の商品ページ（rice/page.tsx、mineral-water/page.tsx等）を参考に実装。

主要なコンポーネント：
- 商品一覧表示
- フィルタリング機能
- ソート機能
- 価格更新機能（ローカル環境のみ）

## 4. 統合とテスト

### 4.1 全商材スクレイピングへの統合

自動的に`/api/scrape-all`エンドポイントに含まれます（レジストリへの登録により）。

### 4.2 テスト手順

1. **個別スクレイピングテスト**
   ```bash
   curl -X GET "http://localhost:8000/api/{product-type}/search?keyword=キーワード&force=true"
   ```

2. **全商材スクレイピングテスト**
   ```bash
   curl -X GET "http://localhost:8000/api/scrape-all"
   ```

3. **フロントエンド表示確認**
   ```
   http://localhost:3000/{product-type}
   ```

### 4.3 チェックリスト

- [ ] データベーステーブル作成完了
- [ ] Pythonスクレイパー実装完了
- [ ] レジストリへの登録完了
- [ ] データベース保存メソッド追加完了
- [ ] APIエンドポイント作成完了
- [ ] 型定義追加完了
- [ ] フロントエンドページ作成完了
- [ ] 個別スクレイピング動作確認
- [ ] 全商材スクレイピング動作確認
- [ ] フロントエンド表示確認

## 5. 注意事項

### 5.1 命名規則

- **Pythonファイル**: snake_case（例: `rice_scraper.py`）
- **TypeScriptファイル**: kebab-case（例: `mineral-water.ts`）
- **クラス名**: PascalCase（例: `RiceScraper`）
- **テーブル名**: snake_case（例: `rice_products`）
- **URLパス**: kebab-case（例: `/mineral-water`）

### 5.2 共通の落とし穴

1. **重複ASIN処理**: スクレイピング時に同じASINが複数回出現する場合の処理
2. **非同期/同期の混在**: Supabaseクライアントのメソッドは同期的
3. **import文**: 相対インポートと絶対インポートの使い分け
4. **APIレスポンス形式**: 配列を返すかオブジェクトを返すか統一する
5. **タイムゾーン**: UTCで保存し、表示時にJSTに変換

### 5.3 パフォーマンス考慮事項

- 大量の商品を扱う場合はページネーション実装
- キャッシュ戦略の検討（1時間、4時間等）
- インデックスの適切な設定
- 不要なGPT APIコールの削減

## 6. 拡張可能性

将来的な拡張を考慮して：

1. **フィルタリング**: 商品固有のフィルタ条件を実装
2. **ソート**: 単価以外のソート条件追加
3. **詳細ページ**: 個別商品の詳細表示ページ
4. **価格履歴**: price_historyテーブルへの記録
5. **通知機能**: 価格変動通知の実装

---

このガイドに従って新商材を追加することで、統一されたアーキテクチャを維持しながら、効率的に機能を拡張できます。