# CLAUDE.md - プロジェクト固有の指示

## 重要なルール

### 1. ビルドテスト必須
**必ず `npm run build` を実行してビルドが成功することを確認してからプッシュすること**

### 2. 環境変数
本番環境（Vercel）で必要な環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AMAZON_PARTNER_TAG`
- `OPENAI_API_KEY`

### 3. データベーステーブル名
- トイレットペーパー: `toilet_paper_products`
- 洗剤: `dishwashing_liquid_products`

### 4. デプロイメント
- フロントエンド/API: Vercel (https://amazon-price-comparision.vercel.app/)
- スケジュール実行: GitHub Actions (2時間ごと)
- データベース: Supabase

### 5. API構成
- Vercel FunctionsはSupabaseから直接データを取得
- 実際のスクレイピングはGitHub Actionsで実行
- ローカル開発時はPythonバックエンド（port 8000）を使用

### 6. コミット前のチェックリスト
1. [ ] `npm run build` が成功する
2. [ ] TypeScriptエラーがない
3. [ ] APIエンドポイントが正しい（localhost vs production）
4. [ ] 不要なconsole.logを削除
5. [ ] **ローカルでテストを実行して動作確認済み**（テストなしでのコミット禁止）