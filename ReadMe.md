# Amazon Price Comparison - 日用品価格比較サイト

日用品（トイレットペーパー・食器用洗剤）のAmazon価格を自動収集し、単価比較で最適な商品を見つけるWebアプリケーション。ブログ機能を統合し、商品レビューや比較記事も配信。

**本番環境**: https://amazon-price-comparision.vercel.app  
**リポジトリ**: https://github.com/hrism/toilet-paper-price-compare

## 🎯 主要機能

### 価格比較システム
- **トイレットペーパー**: 1ロール単価・1m単価で比較
- **食器用洗剤**: 1000ml単価で比較  
- **自動更新**: 4時間ごとにAmazonから最新価格を取得
- **スマート解析**: OpenAI APIで商品情報を自動解析

### ブログ機能
- **リッチテキストエディタ**: MDXEditorによる記事作成
- **画像管理**: Supabase Storageで画像アップロード
- **カテゴリ別表示**: 商品ページに関連記事を自動表示
- **SEO最適化**: メタタグ・OGP対応

### セキュリティ
- **ブルートフォース対策**: 5回失敗で48時間アカウントロック
- **レート制限**: API呼び出し制限（10リクエスト/分）
- **CSRF保護**: APIエンドポイントの保護
- **セキュリティヘッダー**: XSS・クリックジャッキング対策

## 🚀 クイックスタート

### 必要要件
- Node.js 18+
- Python 3.11+
- Supabaseアカウント
- OpenAI APIキー

### 1. リポジトリのクローン
```bash
git clone https://github.com/hrism/toilet-paper-price-compare.git
cd toilet-paper-price-compare
```

### 2. 環境変数の設定
`.env.local`ファイルを作成:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Amazon Partner
NEXT_PUBLIC_AMAZON_PARTNER_TAG=your_partner_tag

# スクレイピングAPI保護（本番環境用）
SCRAPE_AUTH_TOKEN=your_secure_random_token  # 本番環境で設定
```

### 3. 依存関係のインストール
```bash
# フロントエンド
npm install

# バックエンド（オプション：ローカル開発用）
cd python-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. 開発サーバーの起動
```bash
# フロントエンド
npm run dev

# バックエンド（オプション）
cd python-backend
uvicorn app.main:app --reload --port 8000
```

### 5. アクセス
- フロントエンド: http://localhost:3000
- 管理画面: http://localhost:3000/admin
- APIドキュメント: http://localhost:8000/docs （ローカルバックエンド使用時）

## 📂 プロジェクト構成

```
toilet-paper-price-compare/
├── app/                      # Next.js App Router
│   ├── admin/               # 管理画面
│   │   ├── page.tsx        # ダッシュボード（48時間ブロック実装）
│   │   ├── post/           # 記事編集
│   │   ├── categories/     # カテゴリ管理
│   │   └── scrape-status/  # スクレイピング監視
│   ├── api/                 # APIエンドポイント
│   │   ├── blog/           # ブログAPI
│   │   ├── products/       # 商品API（Vercel Functions）
│   │   └── scrape-status/  # ステータスAPI
│   ├── blog/               # ブログページ
│   ├── toilet-paper/       # トイレットペーパー商品一覧
│   └── dishwashing-liquid/ # 食器用洗剤商品一覧
├── components/              # 再利用可能コンポーネント
│   ├── CategoryBlogSection.tsx  # カテゴリ別記事表示
│   ├── BlogCard.tsx             # 記事カード
│   └── MarkdownEditor.tsx      # MDXエディタ
├── lib/                     # ユーティリティ
│   ├── supabase.ts         # Supabaseクライアント
│   ├── auth-utils.ts       # 認証・レート制限
│   └── blog-utils.ts       # ブログユーティリティ
├── python-backend/          # Pythonバックエンド
│   ├── app/                # FastAPIアプリケーション
│   │   ├── scraper.py      # Amazonスクレイパー
│   │   ├── chatgpt_parser.py # OpenAI解析
│   │   └── database.py     # DB操作
│   └── requirements.txt    # Python依存関係
├── .github/workflows/       # GitHub Actions
│   └── scrape.yml          # 4時間ごとの自動スクレイピング
└── middleware.ts           # CSRF保護・セキュリティヘッダー

## 🛠 技術スタック

### フロントエンド
- **Next.js 14.2.11** - App Router, React Server Components
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - ユーティリティファーストCSS
- **MDXEditor** - リッチテキスト編集（日本語対応）
- **Supabase Auth** - 認証システム

### バックエンド
- **Vercel Functions** - サーバーレスAPI
- **FastAPI** - ローカル開発用API
- **Supabase** - PostgreSQLデータベース・ストレージ
- **GitHub Actions** - 定期スクレイピング（4時間ごと）

### 外部サービス
- **OpenAI API** - 商品情報の自動解析
- **Amazon** - 商品データソース
- **Vercel** - ホスティング・デプロイメント

## 📊 データベース構成

### Supabaseテーブル

#### トイレットペーパー商品
```sql
create table toilet_paper_products (
    id uuid primary key default gen_random_uuid(),
    asin text not null unique,
    title text not null,
    description text,
    brand text,
    image_url text,
    price integer,
    price_regular integer,
    discount_percent integer,
    on_sale boolean default false,
    review_avg numeric(2,1),
    review_count integer,
    roll_count integer,
    length_m numeric(5,1),
    total_length_m numeric(7,1),
    price_per_roll numeric(7,2),
    price_per_m numeric(7,3),
    is_double boolean,
    last_fetched_at timestamp default now(),
    updated_at timestamp default now()
);
```

#### 食器用洗剤商品
```sql
create table dishwashing_liquid_products (
    id uuid primary key default gen_random_uuid(),
    asin text not null unique,
    title text not null,
    description text,
    brand text,
    image_url text,
    price integer,
    price_regular integer,
    discount_percent integer,
    on_sale boolean default false,
    review_avg numeric(2,1),
    review_count integer,
    volume_ml integer,
    price_per_1000ml numeric(7,2),
    is_refill boolean default false,
    last_fetched_at timestamp default now(),
    updated_at timestamp default now()
);
```

#### ブログ記事
```sql
create table blog_posts (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text unique not null,
    content text,
    excerpt text,
    category text,
    tags text[],
    status text check (status in ('draft', 'published', 'scheduled')),
    author_id uuid references auth.users(id),
    author_name text,
    featured_image text,
    meta_title text,
    meta_description text,
    published_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now()
);
```

## 🔌 APIエンドポイント

### 商品API
```typescript
// トイレットペーパー商品一覧
GET /api/products?type=toilet_paper
Query Parameters:
  - sort: price_per_m | price_per_roll | price | review_avg
  - order: asc | desc
  - min_rating: number (1-5)
  - page: number
  - limit: number

// 食器用洗剤商品一覧  
GET /api/products?type=dishwashing_liquid
Query Parameters:
  - sort: price_per_1000ml | price | review_avg
  - is_refill: boolean
```

### ブログAPI
```typescript
// 記事一覧
GET /api/blog/posts
Query Parameters:
  - category: string
  - tag: string
  - status: draft | published | scheduled
  - limit: number
  - offset: number

// 個別記事
GET /api/blog/posts/[slug]

// カテゴリ一覧
GET /api/blog/categories
```

### 管理API
```typescript
// スクレイピングステータス
GET /api/scrape-status
Response:
  - lastUpdate: { toiletPaper, dishwashing }
  - nextScheduledRun: string
  - productCounts: { toiletPaper, dishwashing }
```

## 🔐 セキュリティ実装

### 認証・認可
- **Supabase Auth**: メール/パスワード認証
- **セッション管理**: JWTトークンによる認証状態管理
- **権限チェック**: 管理画面へのアクセス制御

### ブルートフォース対策
```typescript
// /app/admin/page.tsx
- ログイン試行回数の記録
- 3回失敗: 指数関数的な遅延（2^n秒）
- 5回失敗: 48時間アカウントロック
- ロック解除: 48時間経過後自動解除
```

### API保護
```typescript
// /middleware.ts
- CSRF保護: Origin/Refererヘッダー検証
- セキュリティヘッダー:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
```

### レート制限
```typescript
// /lib/auth-utils.ts
- APIエンドポイント: 10リクエスト/分/IP
- ログイン試行: 5回/15分/アカウント
- 自動ブロック: 異常なアクセスパターン検出時
```

### スクレイピングAPI保護
```python
// /python-backend/app/main.py
- 環境変数 SCRAPE_AUTH_TOKEN によるトークン認証
- force=true（強制スクレイピング）時のみ認証が必要
- ローカル開発環境では自動的に認証をスキップ
- GitHub Actions環境では GITHUB_ACTIONS=true で判定
```

## 🚀 デプロイメント

### 本番環境（Vercel）

#### 環境変数設定
Vercelダッシュボードで設定:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  
NEXT_PUBLIC_AMAZON_PARTNER_TAG
OPENAI_API_KEY
SCRAPE_AUTH_TOKEN  # スクレイピングAPI保護用（ランダムな32文字以上推奨）
```

#### デプロイコマンド
```bash
# ビルドテスト
npm run build

# デプロイ
git add .
git commit -m "feat: your feature"
git push origin feature/blog
```

### GitHub Actions設定

#### シークレット設定
リポジトリSettings → Secrets:
```
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

#### スケジュール実行
`.github/workflows/scrape.yml`:
- 実行頻度: 4時間ごと（cron: '0 */4 * * *'）
- 手動実行: Actions → Run workflow

## 📈 監視・運用

### スクレイピング監視

#### 管理画面での確認
1. https://amazon-price-comparision.vercel.app/admin にログイン
2. 「スクレイピング状況」をクリック
3. 確認項目:
   - 最終更新時刻（4時間以内なら「最新」表示）
   - 商品数
   - 次回実行予定時刻

#### GitHub Actionsでの確認
1. GitHubリポジトリ → Actionsタブ
2. 「Scheduled Product Scraping」を選択
3. 実行履歴から成功/失敗を確認
4. 手動実行: "Run workflow"ボタン

### エラー対応

#### スクレイピング失敗時
```bash
# ローカルでテスト実行
cd python-backend
python -c "import asyncio; from app.scraper import AmazonScraper; ..."
```

#### API接続エラー
```bash
# Supabase接続テスト
curl https://[your-project].supabase.co/rest/v1/toilet_paper_products?limit=1 \
  -H "apikey: your_anon_key"
```

## 🧪 テスト・デバッグ

### ビルドテスト
```bash
# TypeScriptチェック
npm run type-check

# ビルド
npm run build

# 本番環境シミュレーション
npm run start
```

### よくあるエラーと対処法

#### Webpack Module Error
```bash
# キャッシュクリア
rm -rf .next
npm run dev
```

#### Supabase認証エラー
```javascript
// 認証状態確認
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

#### スクレイピング失敗
```python
# デバッグモード実行
DEBUG=true python app/scraper.py
```

## 📝 トラブルシューティング

### Q: 管理画面にログインできない
A: Supabaseダッシュボードでユーザーを確認し、必要に応じて新規作成

### Q: スクレイピングが実行されない
A: GitHub Actions → Settings → Secrets でAPI キーが正しく設定されているか確認

### Q: 商品が表示されない
A: Supabaseダッシュボードでテーブルにデータが存在するか確認

### Q: ブログ画像がアップロードできない
A: Supabase Storage → Policies で public アクセスが許可されているか確認

## 🤝 コントリビューション

1. Issueを作成して機能提案・バグ報告
2. フォークしてfeatureブランチを作成
3. 変更をコミット（conventional commits推奨）
4. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 📞 サポート

- Issues: [GitHub Issues](https://github.com/hrism/toilet-paper-price-compare/issues)
- Email: support@example.com

---

*Last Updated: 2025-08-16*