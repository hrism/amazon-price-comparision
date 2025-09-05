# CLAUDE.md - プロジェクト固有の指示

## コマンド

### SEOコマンド
ユーザーが「SEO」と言ったら、現在開いているMarkdownファイル（通常はdraft記事）に以下の処理を行う：

1. **まず記事の冒頭を確認** - すでに`---`で始まるメタデータがある場合はスキップ
2. **SEOメタデータを追加**：
   - SEO向きのキャッチーなタイトル
   - URLスラッグ（英数字とハイフン）
   - SEO説明文（160文字以内推奨）
   - キーワード（カンマ区切り）

フォーマット例：
```yaml
---
title: "【2025年最新】トイレットペーパーを最安値で買う方法を徹底解説！"
slug: "toilet-paper-cheapest-guide-2025"
meta_description: "トイレットペーパーの価格比較と最安値で購入する方法を解説。Amazonでの単価比較のコツや、まとめ買いのポイントをプロが伝授します。"
meta_keywords: "トイレットペーパー,価格比較,Amazon,最安値,まとめ買い,単価"
---
```

**注意**: すでにメタデータが存在する記事（冒頭が`---`で始まる）は処理をスキップする

## 重要なルール

### 1. ローカルテスト必須
**必ずローカルでテストを実行してから変更をコミット・プッシュすること**
- Curlコマンド等で必ず対象ページを確認してから完了報告を行う
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

Twitter自動投稿機能用（オプション）：
- `TWITTER_API_KEY` - Twitter API Key (Consumer Key)
- `TWITTER_API_SECRET` - Twitter API Secret (Consumer Secret)
- `TWITTER_ACCESS_TOKEN` - Twitter Access Token
- `TWITTER_ACCESS_TOKEN_SECRET` - Twitter Access Token Secret
- `NEXT_PUBLIC_BASE_URL` - 本番環境のベースURL（デフォルト: https://www.yasu-ku-kau.com）

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
6. [ ] **各商材ページのAPIが正常に動作することを確認**
   - トイレットペーパーページ: `curl http://localhost:3000/toilet-paper` でページが表示され、商品データが取得できること
   - 食器用洗剤ページ: `curl http://localhost:3000/dishwashing-liquid` でページが表示され、商品データが取得できること
   - ミネラルウォーターページ: `curl http://localhost:3000/mineral-water` でページが表示され、商品データが取得できること  
   - 米ページ: `curl http://localhost:3000/rice` でページが表示され、商品データが取得できること
   - **重要**: ローディングスケルトンが表示されたままにならず、実際の商品データが表示されることを必ず確認

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

### 10. APIエンドポイントの日本語パラメータ
**重要**: curlやAPIリクエストで日本語パラメータを使用する場合は、必ずURLエンコードすること
- NG: `keyword=ミネラルウォーター` 
- OK: `keyword=%E3%83%9F%E3%83%8D%E3%83%A9%E3%83%AB%E3%82%A6%E3%82%A9%E3%83%BC%E3%82%BF%E3%83%BC`
- NG: `keyword=食器用洗剤`
- OK: `keyword=%E9%A3%9F%E5%99%A8%E7%94%A8%E6%B4%97%E5%89%A4`
- NG: `keyword=トイレットペーパー`
- OK: `keyword=%E3%83%88%E3%82%A4%E3%83%AC%E3%83%83%E3%83%88%E3%83%9A%E3%83%BC%E3%83%91%E3%83%BC`

### 11. 全商品一括スクレイピング手順
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
     curl -X GET "http://localhost:8000/api/dishwashing/search?keyword=%E9%A3%9F%E5%99%A8%E7%94%A8%E6%B4%97%E5%89%A4&force=true"
     ```
   - ミネラルウォーターのみ：
     ```bash
     curl -X GET "http://localhost:8000/api/mineral-water/search?keyword=%E3%83%9F%E3%83%8D%E3%83%A9%E3%83%AB%E3%82%A6%E3%82%A9%E3%83%BC%E3%82%BF%E3%83%BC&force=true"
     ```

4. **既存スクリプトを使った管理**
   - 全商品チェック：`python check_all_products.py`
   - 本番DB接続確認：`python check_production_db.py`
   - テスト商品削除：`python delete_test_products.py`

### 12. Twitter自動投稿機能
ブログ記事の公開時にTwitterへ自動投稿される仕組み：

1. **即時公開の場合**（status: 'published'）
   - 管理画面から記事を作成し、即座に公開する場合
   - `/api/admin/create-post` エンドポイントが記事作成後にTwitterへ投稿

2. **予約投稿の場合**（status: 'scheduled'）
   - 予約時刻になると `/api/publish-scheduled` が実行される（GitHub Actions経由）
   - 記事のステータスを'published'に変更し、同時にTwitterへ投稿

3. **Twitter API設定**
   - Twitter Developer Portalでアプリケーションを作成
   - OAuth 1.0a認証用のキーとトークンを取得
   - Vercel環境変数に設定（TWITTER_API_KEY, TWITTER_API_SECRET等）

4. **投稿フォーマット**
   ```
   📝 ブログ更新しました！
   
   「[記事タイトル]」
   
   [記事の抜粋（最大180文字）]
   
   #節約 #お得情報 #価格比較 [カテゴリ別ハッシュタグ]
   [記事URL]
   ```

5. **エラーハンドリング**
   - Twitter API認証情報が設定されていない場合はスキップ（エラーにしない）
   - 投稿失敗時もブログ記事の公開は続行される
   - 各記事の投稿間に1秒の待機時間を設けてAPI制限を回避