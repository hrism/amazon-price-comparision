# AWS Lambda スクレイピング関数

GitHub ActionsのIPブロック問題を解決するため、AWS Lambdaでスクレイピングを実行します。

## セットアップ手順

### 1. IAMロールの作成
```bash
chmod +x setup_iam.sh
./setup_iam.sh
```

### 2. 環境変数の設定
`.env`ファイルを作成:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
```

### 3. Chromeレイヤーの設定

#### オプション1: 事前構築済みレイヤーを使用（推奨）
デプロイスクリプトで自動的に以下のレイヤーが追加されます：
```
arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:33
```

#### オプション2: カスタムレイヤーを作成
```bash
chmod +x setup_layer.sh
./setup_layer.sh
```

### 4. デプロイ
```bash
# deploy.shのROLE_ARNを更新
# YOUR_ACCOUNT_IDを実際のAWSアカウントIDに置換

chmod +x deploy.sh
source .env  # 環境変数を読み込み
./deploy.sh
```

## Lambda関数の設定

- **Runtime**: Python 3.11
- **Memory**: 1024 MB (1GB)
- **Timeout**: 900秒 (15分)
- **Layers**: Chrome/ChromeDriver層
- **環境変数**:
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
  - `OPENAI_API_KEY`: OpenAI API Key
  - `SCRAPE_AUTH_TOKEN`: （オプション）API保護用トークン

## EventBridgeスケジュール

2時間ごとに自動実行されます：
- トイレットペーパー
- 食器用洗剤

## テスト実行

```bash
# 手動テスト（EventBridge経由の場合）
aws lambda invoke \
  --function-name amazon-price-scraper \
  --payload '{"product_types": ["toilet_paper"]}' \
  output.json

# 強制スクレイピング（認証トークン付き）
aws lambda invoke \
  --function-name amazon-price-scraper \
  --payload '{"product_types": ["toilet_paper"], "force_scrape": true, "scrape_token": "YOUR_SECRET_TOKEN"}' \
  output.json

# ログ確認
aws logs tail /aws/lambda/amazon-price-scraper --follow
```

## コスト

月間コスト（2時間ごと実行）:
- 実行回数: 360回/月
- 実行時間: 約30秒/回
- メモリ: 1GB
- **推定コスト: 約$0.09/月（無料枠内）**

## トラブルシューティング

### Chromeが起動しない
- レイヤーが正しく設定されているか確認
- メモリを2048MBに増やしてみる

### タイムアウト
- タイムアウトを15分（最大）に設定
- スクレイピング対象を減らす

### 権限エラー
- IAMロールに必要な権限があるか確認
- CloudWatch Logsへの書き込み権限を確認