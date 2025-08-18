#!/bin/bash

# Seleniumレイヤーのセットアップスクリプト

echo "Setting up Chrome and ChromeDriver layer for Lambda..."

# 作業ディレクトリの作成
mkdir -p lambda-layer
cd lambda-layer

# Chrome用のレイヤーをダウンロード（chrome-aws-lambda）
echo "Downloading chrome-aws-lambda..."
mkdir -p nodejs
cd nodejs
npm init -y
npm install chrome-aws-lambda puppeteer-core

# Python用のSeleniumパッケージ
cd ..
mkdir -p python
cd python
pip install selenium -t .

# レイヤー用のZIPファイルを作成
cd ..
zip -r chrome-layer.zip nodejs python

echo "Layer created: chrome-layer.zip"
echo ""
echo "次のステップ:"
echo "1. AWS Consoleにログイン"
echo "2. Lambda > Layers > Create layer"
echo "3. chrome-layer.zipをアップロード"
echo "4. Compatible runtimes: Python 3.9, 3.10, 3.11を選択"
echo ""
echo "注意: chrome-aws-lambdaの代わりに、以下のARNも使用可能:"
echo "arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:33"