#!/bin/bash

# AWS Lambda デプロイスクリプト

# 設定
FUNCTION_NAME="amazon-price-scraper"
REGION="ap-northeast-1"
RUNTIME="python3.11"
HANDLER="scraper_function.lambda_handler"
TIMEOUT=900  # 15分
MEMORY_SIZE=1024  # 1GB
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-scraper-role"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Lambda関数のデプロイを開始...${NC}"

# 1. 依存関係のインストール
echo -e "${YELLOW}1. 依存関係をインストール中...${NC}"
pip install -r requirements.txt -t package/

# 2. デプロイパッケージの作成
echo -e "${YELLOW}2. デプロイパッケージを作成中...${NC}"
cp scraper_function.py package/
cd package
zip -r ../deployment.zip .
cd ..

# 3. Lambda関数の作成または更新
echo -e "${YELLOW}3. Lambda関数をデプロイ中...${NC}"

# 関数が存在するかチェック
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    # 関数が存在する場合は更新
    echo "既存の関数を更新中..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip \
        --region $REGION
    
    # 設定の更新
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "Variables={
            NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL},
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY},
            OPENAI_API_KEY=${OPENAI_API_KEY}
        }" \
        --region $REGION
else
    # 関数が存在しない場合は作成
    echo "新規関数を作成中..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://deployment.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "Variables={
            NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL},
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY},
            OPENAI_API_KEY=${OPENAI_API_KEY}
        }" \
        --region $REGION
fi

# 4. Chromeレイヤーの追加
echo -e "${YELLOW}4. Chromeレイヤーを追加中...${NC}"
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --layers "arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:33" \
    --region $REGION

# 5. EventBridgeスケジュールの設定
echo -e "${YELLOW}5. EventBridgeスケジュールを設定中...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Lambda関数への権限を追加
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id scheduled-event \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:$REGION:$ACCOUNT_ID:rule/amazon-price-scraper-schedule" \
    --region $REGION 2>/dev/null

# EventBridgeルールの作成
aws events put-rule \
    --name amazon-price-scraper-schedule \
    --schedule-expression "rate(2 hours)" \
    --state ENABLED \
    --description "2時間ごとにAmazon価格スクレイピングを実行" \
    --region $REGION

# ターゲットの追加
aws events put-targets \
    --rule amazon-price-scraper-schedule \
    --targets "Id=1,Arn=arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME,Input={\"product_types\":[\"toilet_paper\",\"dishwashing_liquid\"]}" \
    --region $REGION

# クリーンアップ
echo -e "${YELLOW}6. クリーンアップ中...${NC}"
rm -rf package/
rm deployment.zip

echo -e "${GREEN}デプロイ完了！${NC}"
echo ""
echo "次のステップ:"
echo "1. AWS Consoleで関数が作成されたことを確認"
echo "2. テスト実行: aws lambda invoke --function-name $FUNCTION_NAME output.json"
echo "3. ログ確認: aws logs tail /aws/lambda/$FUNCTION_NAME --follow"