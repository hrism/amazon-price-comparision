# デプロイメントガイド

## 前提条件
- GitHubアカウント
- Vercelアカウント（無料）
- Supabaseプロジェクト（既存）
- OpenAI APIキー

## ステップ1: GitHub リポジトリの準備

1. このリポジトリをフォークまたはクローン
2. GitHub Secretsの設定（Settings > Secrets and variables > Actions）
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   ```

## ステップ2: Vercel へのデプロイ

### 2.1 Vercel CLIを使用する場合

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトディレクトリで実行
vercel

# 質問に答える
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? toilet-paper-price-compare
# - Directory? ./
# - Override settings? No
```

### 2.2 Vercel ダッシュボードを使用する場合

1. https://vercel.com にアクセス
2. "Import Project" をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定（下記参照）
5. "Deploy" をクリック

### 2.3 環境変数の設定

Vercelダッシュボード > Settings > Environment Variables で以下を設定：

```env
# 必須
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key

# オプション
NEXT_PUBLIC_AMAZON_PARTNER_TAG=your_partner_tag
```

## ステップ3: GitHub Actions の有効化

1. リポジトリの Actions タブを開く
2. "I understand my workflows, go ahead and enable them" をクリック
3. 初回の手動実行：
   - "Scheduled Product Scraping" ワークフローを選択
   - "Run workflow" をクリック

## ステップ4: 動作確認

### 4.1 フロントエンドの確認
```
https://[your-project].vercel.app
```

### 4.2 APIの確認
```bash
# トイレットペーパー商品一覧
curl https://[your-project].vercel.app/api/search

# 食器用洗剤商品一覧
curl https://[your-project].vercel.app/api/dishwashing/search
```

### 4.3 GitHub Actionsの確認
- Actions タブで実行状況を確認
- 2時間ごとに自動実行されることを確認

## ステップ5: カスタムドメイン（オプション）

1. Vercelダッシュボード > Settings > Domains
2. カスタムドメインを追加
3. DNSレコードを設定

## トラブルシューティング

### Vercel Functions がタイムアウトする
- `vercel.json` の `maxDuration` を調整（最大60秒）

### GitHub Actions が失敗する
- Secrets が正しく設定されているか確認
- Chrome のインストールが成功しているか確認

### データベース接続エラー
- Supabase の URL と Key が正しいか確認
- Service Role Key を使用しているか確認（GitHub Actions用）

## セキュリティ注意事項

1. **絶対に公開しないもの**
   - `SUPABASE_SERVICE_KEY`
   - `OPENAI_API_KEY`
   
2. **公開可能なもの**
   - `NEXT_PUBLIC_*` で始まる環境変数
   
3. **推奨事項**
   - Supabase の Row Level Security (RLS) を有効化
   - API レート制限の実装
   - CORS の適切な設定

## 監視とログ

### Vercel
- Dashboard > Functions タブでログ確認
- Analytics で使用状況を監視

### GitHub Actions
- Actions タブで実行履歴確認
- 失敗時は自動通知（設定必要）

### Supabase
- Dashboard でデータベース使用量確認
- API ログの確認

## コスト管理

| サービス | 無料枠 | 超過時の料金 |
|---------|--------|-------------|
| Vercel | 100GB-Hours/月 | $0.18/GB-Hour |
| GitHub Actions | 2000分/月 | $0.008/分 |
| Supabase | 500MB, 2GB転送 | $25/月〜 |
| OpenAI | なし | 使用量に応じて |

## メンテナンス

### 定期的な確認事項
- [ ] GitHub Actions の実行状況（週1回）
- [ ] Vercel の使用量（月1回）
- [ ] Supabase のストレージ使用量（月1回）
- [ ] OpenAI API の使用料金（月1回）

### アップデート手順
1. ローカルで変更を実施
2. `feature` ブランチにプッシュ
3. Pull Request を作成
4. マージ後、Vercel が自動デプロイ

## サポート

問題が発生した場合：
1. このドキュメントのトラブルシューティングを確認
2. GitHub Issues で報告
3. Vercel、Supabase のドキュメントを参照

---

最終更新: 2024年1月
作成者: 開発チーム