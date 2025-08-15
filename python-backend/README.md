# Python Backend for Toilet Paper Price Compare

## セットアップ

### 1. Python環境の準備
```bash
cd python-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. 依存関係のインストール
```bash
pip install -r requirements.txt
```

### 3. GiNZAモデルのダウンロード
GiNZAは`ja-ginza`パッケージのインストール時に自動的にモデルもインストールされます。
追加のダウンロードは不要です。

### 4. 環境変数の設定
```bash
cp ../.env .env
```

### 5. Chrome/Chromiumのインストール
undetected_chromedriverを使用するため、システムにChromeまたはChromiumがインストールされている必要があります。

## 起動方法

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## APIエンドポイント

- `GET /` - ヘルスチェック
- `GET /api/search` - 商品検索
  - Parameters:
    - `keyword`: 検索キーワード（デフォルト: "トイレットペーパー"）
    - `filter`: フィルタ（"single", "double", "sale"）
    - `force`: キャッシュを無視して強制的に新規取得（true/false）

## Next.jsフロントエンドとの連携

Next.jsアプリケーションから以下のようにAPIを呼び出します：

```typescript
const response = await fetch('http://localhost:8000/api/search?keyword=トイレットペーパー&filter=double');
const products = await response.json();
```