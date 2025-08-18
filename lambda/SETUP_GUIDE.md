# AWS Lambda セットアップ詳細手順

## 事前準備

### 1. AWS アカウントIDの取得
```bash
# AWS CLIがインストールされている場合
aws sts get-caller-identity --query Account --output text

# または、AWSコンソールから確認
# 右上のアカウント名をクリック → アカウントID（12桁の数字）をコピー
```

### 2. 必要な情報の確認
- Supabase URL（プロジェクト設定から取得）
- Supabase Anon Key（プロジェクト設定から取得）
- OpenAI API Key（OpenAIダッシュボードから取得）

---

## ステップ1: IAMロールの作成（AWSコンソールから）

1. **AWSコンソールにログイン**
   - https://console.aws.amazon.com/

2. **IAMサービスを開く**
   - 検索バーで「IAM」を検索してクリック

3. **ロールを作成**
   - 左メニューから「ロール」をクリック
   - 「ロールを作成」ボタンをクリック

4. **信頼されたエンティティを選択**
   - 「AWS サービス」を選択
   - 「Lambda」を選択
   - 「次へ」をクリック

5. **アクセス許可ポリシーを追加**
   - 「AWSLambdaBasicExecutionRole」を検索して選択
   - 「次へ」をクリック

6. **ロール名を設定**
   - ロール名: `lambda-scraper-role`
   - 「ロールを作成」をクリック

7. **ロールARNをメモ**
   - 作成したロールをクリック
   - ARN（例: `arn:aws:iam::123456789012:role/lambda-scraper-role`）をコピー

---

## ステップ2: Lambda関数の作成

### 方法A: AWSコンソールから作成（推奨）

1. **Lambda サービスを開く**
   - 検索バーで「Lambda」を検索してクリック

2. **関数を作成**
   - 「関数の作成」ボタンをクリック
   - 「一から作成」を選択

3. **基本情報を設定**
   - 関数名: `amazon-price-scraper`
   - ランタイム: `Python 3.11`
   - アーキテクチャ: `x86_64`
   - 実行ロール: 「既存のロールを使用する」
   - 既存のロール: `lambda-scraper-role`を選択
   - 「関数の作成」をクリック

4. **コードをアップロード**
   - 「コード」タブを開く
   - 「アップロード元」→「.zipファイル」を選択
   - 以下の手順でZIPファイルを作成：

```bash
cd lambda
mkdir deployment
cd deployment

# 依存関係をインストール
pip install requests boto3 selenium -t .

# スクレイパーコードをコピー
cp ../scraper_function.py .

# ZIPファイルを作成
zip -r ../function.zip .
cd ..
```

   - 作成した`function.zip`をアップロード

5. **設定を更新**
   - 「設定」タブ → 「一般設定」→「編集」
   - メモリ: `1024 MB`
   - タイムアウト: `15分0秒`
   - 「保存」をクリック

6. **環境変数を設定**
   - 「設定」タブ → 「環境変数」→「編集」
   - 以下を追加：
     - `NEXT_PUBLIC_SUPABASE_URL`: あなたのSupabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: あなたのSupabase Key
     - `OPENAI_API_KEY`: あなたのOpenAI API Key
     - `SCRAPE_AUTH_TOKEN`: （オプション）API保護用トークン（32文字以上のランダム文字列推奨）
   - 「保存」をクリック

---

## ステップ3: Chromeレイヤーの追加

1. **Lambda関数の画面で「レイヤー」セクションを開く**
   - 関数のページ下部にある「レイヤー」セクション

2. **レイヤーを追加**
   - 「レイヤーの追加」をクリック
   - 「ARNを指定」を選択
   - 以下のARNを入力：
   ```
   arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:33
   ```
   - 「追加」をクリック

---

## ステップ4: EventBridge（スケジューラー）の設定

1. **EventBridge を開く**
   - Lambda関数の画面で「トリガーを追加」をクリック

2. **トリガーの設定**
   - トリガーの選択: `EventBridge (CloudWatch Events)`
   - 新規ルールの作成を選択
   - ルール名: `amazon-scraper-schedule`
   - ルールタイプ: `スケジュール式`
   - スケジュール式: `rate(2 hours)`
   - 「追加」をクリック

---

## ステップ5: テスト実行

1. **テストイベントの作成**
   - Lambda関数の画面で「テスト」タブを開く
   - 「新しいイベントを作成」
   - イベント名: `test-scrape`
   - イベントJSON:
   ```json
   {
     "product_types": ["toilet_paper", "dishwashing_liquid"]
   }
   ```
   - 「保存」をクリック

2. **テスト実行**
   - 「テスト」ボタンをクリック
   - 実行結果を確認
   
   **手動スクレイピング実行（force_scrape）の場合:**
   ```json
   {
     "product_types": ["toilet_paper", "dishwashing_liquid"],
     "force_scrape": true,
     "scrape_token": "YOUR_SECRET_TOKEN"
   }
   ```
   ※ `SCRAPE_AUTH_TOKEN`環境変数が設定されている場合は、正しいトークンが必要

3. **ログの確認**
   - 「モニタリング」タブ → 「CloudWatch ログを表示」
   - 最新のログストリームをクリックして詳細を確認

---

## アップロードファイルの準備

### 必要なファイル一覧
1. `scraper_function.py` - メインのLambda関数コード
2. 依存パッケージ（requests, boto3, selenium）

### ZIPファイルの作成手順
```bash
# 作業ディレクトリを作成
mkdir lambda-deployment
cd lambda-deployment

# 依存関係をインストール
pip install requests boto3 selenium -t .

# scraper_function.pyをコピー
cp /path/to/scraper_function.py .

# ZIPファイルを作成
zip -r function.zip .
```

### アップロード方法
1. Lambda関数のコンソール画面を開く
2. 「コード」タブを選択
3. 「アップロード元」→「.zipファイル」
4. 作成した`function.zip`を選択
5. 「保存」をクリック

---

## トラブルシューティング

### エラー: "Unable to import module"
→ 依存関係が正しくインストールされていない
```bash
pip install requests boto3 selenium -t .
```

### エラー: "Chrome binary not found"
→ Chromeレイヤーが追加されていない
→ 上記ステップ3を確認

### エラー: "Task timed out"
→ タイムアウトを15分に設定

### エラー: "Access denied to Supabase"
→ 環境変数が正しく設定されているか確認

---

## 確認事項チェックリスト

- [ ] AWS アカウントIDを取得した
- [ ] IAMロール `lambda-scraper-role` を作成した
- [ ] Lambda関数 `amazon-price-scraper` を作成した
- [ ] メモリを1GB、タイムアウトを15分に設定した
- [ ] 環境変数（Supabase URL/Key、OpenAI Key）を設定した
- [ ] Chromeレイヤーを追加した
- [ ] EventBridgeで2時間ごとのスケジュールを設定した
- [ ] テスト実行が成功した
- [ ] CloudWatchログでエラーがないことを確認した

---

## Lambda Function URLの設定（再取得ボタン用）

### Lambda Function URLを有効化
1. Lambda関数の画面で「設定」タブ → 「関数URL」
2. 「関数URLを作成」をクリック
3. 認証タイプ: `NONE`（SCRAPE_AUTH_TOKENで保護するため）
4. 「作成」をクリック
5. 生成されたFunction URLをコピー

### Vercelに環境変数を設定
```bash
LAMBDA_FUNCTION_URL=https://xxxxx.lambda-url.ap-northeast-1.on.aws/
NEXT_PUBLIC_SCRAPE_TOKEN=your-secret-token-here
```

### ローカル開発環境の設定
`.env.local`:
```
LAMBDA_FUNCTION_URL=https://xxxxx.lambda-url.ap-northeast-1.on.aws/
NEXT_PUBLIC_SCRAPE_TOKEN=your-secret-token-here
```

これで、再取得ボタンがLambda関数を呼び出すようになります。