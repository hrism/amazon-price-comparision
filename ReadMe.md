# 日用品価格比較サイト（ブログ機能付き）

**リポジトリURL**: https://github.com/hrism/toilet-paper-price-compare

## 🚀 ローカル環境での起動方法

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env`ファイルに以下の環境変数を設定:
```env
# Amazon API
AMAZON_ACCESS_KEY=your_access_key
AMAZON_SECRET_KEY=your_secret_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Django
DJANGO_SECRET_KEY=your_secret_key
DJANGO_DEBUG=True
```

### 3. Pythonバックエンドの起動

#### FastAPI（商品データAPI）
```bash
cd python-backend
source venv/bin/activate  # macOS/Linux
# Windows: venv\Scripts\activate
pip install -r requirements.txt  # 初回のみ
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Django（ブログCMS）
```bash
cd python-backend
source venv/bin/activate
python manage.py migrate  # 初回のみ
python create_superuser.py  # 初回のみ
python manage.py runserver 8001
```

### 4. Next.jsフロントエンドの起動
```bash
npm run dev
```

### アクセスURL
- **フロントエンド**: http://localhost:3000
- **商品API**: http://localhost:8000
- **ブログ管理画面**: http://localhost:3000/admin
  - Supabase認証使用（外部執筆者アカウント作成可能）

---

## 📋 機能一覧

### 🛍️ 商品価格比較
- トイレットペーパーの単価比較（1ロール単価・1m単価）
- 洗剤の単価比較
- レビュー評価フィルタリング
- Amazon商品情報の自動取得・更新

### 📝 ブログ機能（NEW）
- **Multi-author対応**: 複数のライターが記事投稿可能
- **Role-based権限管理**: 編集者は自分の記事のみ編集可能
- **SEO最適化**: メタタグ、OpenGraph、Twitter Cards対応
- **ISR（Incremental Static Regeneration）**: 1時間間隔で静的再生成
- **カテゴリー・タグ機能**: 記事の分類と検索
- **レスポンシブデザイン**: モバイル対応

### 🔒 セキュリティ機能
- **強力なパスワードポリシー**: 12文字以上、大文字・小文字・数字・特殊文字必須
- **ログイン試行制限**: 5回失敗で15分ロックアウト
- **HTTPS強制**: 本番環境でのセキュリティ強化

### 🗺️ SEO・サイトマップ
- **自動サイトマップ生成**: 商品ページ・ブログページを含む
- **SSG（Static Site Generation）**: トップページの高速化

---

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **SSG / ISR** による最適化

### バックエンド
- **FastAPI** (商品データAPI)
- **Django** (ブログCMS・管理画面)
- **SQLite** (開発環境)
- **Supabase** (商品データ)

### 外部API
- **Amazon Product Advertising API**
- **OpenAI API** (テキスト解析)

---

## 📊 データベース設計

### 商品データ（Supabase）
```sql
create table toilet_paper_products (
    id uuid primary key default gen_random_uuid(),
    asin text not null unique,
    title text not null,
    price integer,
    review_avg numeric(2,1),
    review_count integer,
    roll_count integer,
    length_m numeric(5,1),
    price_per_roll numeric(7,2),
    price_per_m numeric(7,3),
    is_double boolean,
    last_fetched_at timestamp default now()
);
```

### ブログデータ（Django SQLite）
```python
class BlogPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    content = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL)
    published_at = models.DateTimeField()
    # SEO fields
    meta_title = models.CharField(max_length=60, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
```

---

## 🔄 API設計

### 商品検索API
```
GET /api/products?type=toilet_paper&sort=price_per_m
```

### ブログAPI
```
GET /api/blog/posts              # 記事一覧
GET /api/blog/posts/{slug}       # 個別記事
GET /api/blog/categories         # カテゴリー一覧
GET /api/blog/sitemap           # ブログサイトマップ
```

### サイトマップ
```
GET /sitemap.xml                # 全体サイトマップ
```

---

## 👥 ユーザー権限

### スーパーユーザー
- 全ての記事・ユーザー・設定の管理
- カテゴリー・タグの作成・編集

### 編集者
- 自分の記事の作成・編集・削除
- 下書き・公開・予約投稿機能
- 画像アップロード

---

## 🚀 デプロイメント

### フロントエンド（Vercel）
- **本番URL**: https://amazon-price-comparision.vercel.app
- **自動デプロイ**: feature/blogブランチ → 本番

### バックエンド
- **FastAPI**: セルフホスティング or クラウド
- **Django**: 管理画面用、内部利用

---

## 📈 パフォーマンス最適化

### ISR設定
```typescript
// ブログページ
{ next: { revalidate: 3600 } } // 1時間ごと再生成
```

### キャッシュ戦略
- **商品データ**: 2時間間隔で更新
- **ブログ記事**: 1時間間隔で静的再生成
- **サイトマップ**: 1時間キャッシュ

---

## 🔧 開発・運用

### 月30記事対応
- **ISR**: 静的生成でコスト削減
- **編集者権限**: 複数ライターでの効率的な投稿
- **SEO最適化**: 検索流入最大化

### 監視・ログ
- **Django**: セキュリティログ（ログイン試行等）
- **FastAPI**: API使用ログ
- **Vercel**: アクセス解析

---

## 📝 TODO / 今後の予定

- [ ] PostgreSQL本番環境セットアップ
- [ ] Redis キャッシュ導入
- [ ] 画像最適化（Next.js Image）
- [ ] PWA対応
- [ ] アナリティクス導入
- [ ] コメント機能（ブログ）
- [ ] 関連記事表示
- [ ] メルマガ機能