# CLAUDE.md - プロジェクト固有の指示

## 重要なルール

### 1. ローカルテスト必須
**必ずローカルでテストを実行してから変更をコミット・プッシュすること**
- スクレイピング機能の変更時は実際にローカルでスクレイピングを実行
- パーサーの変更時は実際のデータで動作確認
- 変更内容が正しく動作することを確認してからコミット

### 2. ビルドテスト必須
**必ず `npm run build` を実行してビルドが成功することを確認してからプッシュすること**

### 3. 環境変数
本番環境（Vercel）で必要な環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AMAZON_PARTNER_TAG`
- `OPENAI_API_KEY`
- `SCRAPE_AUTH_TOKEN` - スクレイピングAPI保護用トークン（32文字以上のランダム文字列推奨）

### 4. データベーステーブル名
- トイレットペーパー: `toilet_paper_products`
- 洗剤: `dishwashing_liquid_products`

### 5. デプロイメント
- フロントエンド/API: Vercel (https://amazon-price-comparision.vercel.app/)
- スケジュール実行: GitHub Actions (2時間ごと)
- データベース: Supabase

### 6. API構成
- Vercel FunctionsはSupabaseから直接データを取得
- 実際のスクレイピングはGitHub Actionsで実行
- ローカル開発時はPythonバックエンド（port 8000）を使用

### 7. コミット前のチェックリスト
1. [ ] `npm run build` が成功する
2. [ ] TypeScriptエラーがない
3. [ ] APIエンドポイントが正しい（localhost vs production）
4. [ ] 不要なconsole.logを削除
5. [ ] **ローカルでテストを実行して動作確認済み**（テストなしでのコミット禁止）

### 8. スクレイピング関連
- 食器用洗剤のスクレイピング更新を反映させるには：
  1. Pythonバックエンドを再起動する（uvicornプロセスをkillして再起動）
  2. エンドポイント: `/api/dishwashing/search?keyword=食器用洗剤&force=true`
  3. プロンプトファイル: `python-backend/app/prompts/dishwashing_liquid.py`

### 9. スクレイピングAPIのセキュリティ
- PythonバックエンドAPIの`/api/search`と`/api/dishwashing/search`エンドポイントで`force=true`指定時に認証を要求
- 環境変数`SCRAPE_AUTH_TOKEN`を設定して、そのトークンを`scrape_token`パラメータで送信する必要がある
- ローカル開発環境（`GITHUB_ACTIONS`環境変数が未設定かつ`SCRAPE_AUTH_TOKEN`も未設定）では認証をスキップ
- GitHub Actions環境では`GITHUB_ACTIONS=true`が設定されているため、トークン認証が有効になる
- 本番環境でAPIを呼び出す場合の例：
  ```
  GET /api/search?keyword=トイレットペーパー&force=true&scrape_token=YOUR_SECRET_TOKEN
  ```

### 10. 全商品一括スクレイピング手順
1. **Pythonバックエンドを起動**
   ```bash
   cd python-backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **全商品スクレイピングAPIを実行**（別ターミナルで）
   ```bash
   curl -X GET "http://localhost:8000/api/scrape-all"
   ```
   - トイレットペーパーと食器用洗剤を一括でスクレイピング
   - 実行時間：約1-2分（商品数による）

3. **個別商品タイプのスクレイピング**
   - トイレットペーパーのみ：
     ```bash
     curl -X GET "http://localhost:8000/api/search?keyword=トイレットペーパー&force=true"
     ```
   - 食器用洗剤のみ：
     ```bash
     curl -X GET "http://localhost:8000/api/dishwashing/search?keyword=食器用洗剤&force=true"
     ```

4. **既存スクリプトを使った管理**
   - 全商品チェック：`python check_all_products.py`
   - 本番DB接続確認：`python check_production_db.py`
   - テスト商品削除：`python delete_test_products.py`