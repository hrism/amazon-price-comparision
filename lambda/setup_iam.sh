#!/bin/bash

# IAMロールとポリシーのセットアップ

ROLE_NAME="lambda-scraper-role"
POLICY_NAME="lambda-scraper-policy"
REGION="ap-northeast-1"

echo "IAMロールを作成中..."

# 1. IAMロールの作成
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://iam_policy.json \
    --description "Role for Lambda scraper function"

# 2. 実行ポリシーのアタッチ
aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name $POLICY_NAME \
    --policy-document file://lambda_execution_policy.json

# 3. 基本実行ロールもアタッチ
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

echo "IAMロール作成完了！"
echo "Role ARN:"
aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text