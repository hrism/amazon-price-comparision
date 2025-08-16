# デプロイメント戦略とアーキテクチャ

## 概要
本プロジェクトは、コスト効率とスケーラビリティを重視したサーバーレスアーキテクチャで構築します。

## アーキテクチャ構成

```
┌─────────────────────────────────────────────────────────┐
│                     ユーザー                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌───────────────────────┐
        │    Vercel (Frontend)    │
        │     - Next.js App       │
        │     - 静的ページ生成     │
        └───────────┬───────────┘
                    │ API Call
                    ▼
        ┌───────────────────────┐
        │  Vercel Functions      │
        │    (Backend API)       │
        │  - /api/search         │
        │  - /api/dishwashing    │
        │  - /api/refetch       │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────┐
│   Supabase   │      │   OpenAI     │
│  (Database)  │      │   (GPT-4)    │
└──────────────┘      └──────────────┘
        ▲
        │ 定期更新
        │
┌───────────────────────┐
│   GitHub Actions      │
│  - 2時間ごとの実行     │
│  - スクレイピング      │
│  - データ更新         │
└───────────────────────┘
```

## デプロイメント先

### 1. フロントエンド：Vercel
- **理由**：Next.js との完璧な統合、無料枠が充実
- **URL**：`https://[project-name].vercel.app`
- **自動デプロイ**：GitHubのmainブランチへのpush時

### 2. バックエンドAPI：Vercel Functions
- **理由**：フロントエンドと同一プラットフォーム、サーバーレスで低コスト
- **エンドポイント**：`/api/*`
- **無料枠**：100GB-Hours/月

### 3. 定期実行：GitHub Actions
- **理由**：無料枠2000分/月、設定が簡単
- **実行頻度**：2時間ごと
- **処理内容**：
  - 商品情報のスクレイピング
  - 価格情報の更新
  - セール情報の検出

### 4. データベース：Supabase（既存）
- **無料枠**：500MB ストレージ、無制限API呼び出し

## コスト見積もり

| サービス | 月額コスト | 備考 |
|---------|-----------|------|
| Vercel | $0 | 無料枠内 |
| Vercel Functions | $0 | 100GB-Hours/月の無料枠内 |
| GitHub Actions | $0 | 2000分/月の無料枠内 |
| Supabase | $0 | 無料枠内 |
| OpenAI API | ~$5 | 使用量に応じて |
| **合計** | **~$5** | |

## 環境変数の管理

### Vercel環境変数（Production）
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Amazon Partner
NEXT_PUBLIC_AMAZON_PARTNER_TAG=your_partner_tag

# OpenAI (Functions用)
OPENAI_API_KEY=your_openai_api_key
```

### GitHub Secrets（Actions用）
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
```

## デプロイメント手順

### Phase 1: Vercel Functions への移行
1. Python バックエンドを TypeScript/JavaScript に変換
2. `/api` ディレクトリに各エンドポイントを作成
3. ローカルでテスト

### Phase 2: Vercel へのデプロイ
1. Vercel アカウントの作成
2. GitHub リポジトリとの連携
3. 環境変数の設定
4. 初回デプロイ

### Phase 3: GitHub Actions の設定
1. `.github/workflows/scrape.yml` の作成
2. GitHub Secrets の設定
3. 動作確認

### Phase 4: 本番切り替え
1. DNS設定（カスタムドメインの場合）
2. 監視設定
3. エラー通知の設定

## セキュリティ考慮事項

1. **API キーの保護**
   - 環境変数として管理
   - クライアントサイドには露出しない

2. **レート制限**
   - Vercel Functions で実装
   - DDoS 対策

3. **CORS 設定**
   - 適切なオリジン制限

## モニタリング

1. **Vercel Analytics**
   - ページビュー
   - Web Vitals

2. **GitHub Actions**
   - 実行ログ
   - 失敗通知

3. **Supabase Dashboard**
   - データベース使用量
   - API呼び出し数

## ロールバック戦略

1. Vercel の自動ロールバック機能を使用
2. GitHub Actions は前バージョンのワークフローを再実行
3. データベースはSupabaseのバックアップから復元

## 今後の拡張性

- **スケールアップ時**：Vercel Pro プラン（$20/月）へ移行
- **より頻繁な更新が必要な場合**：AWS Lambda + EventBridge へ移行
- **グローバル展開**：Vercel Edge Functions を活用

---

更新日：2024年1月
作成者：開発チーム