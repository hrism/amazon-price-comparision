"""
AWS Lambda用エントリーポイント
EventBridgeから4時間ごとに呼ばれる
"""
import json
from app.update_products import lambda_handler as update_handler

def lambda_handler(event, context):
    """
    AWS Lambda エントリーポイント
    EventBridge (CloudWatch Events) から定期的に呼ばれる
    """
    print(f"Event: {json.dumps(event)}")
    
    # update_products.pyのハンドラーを呼び出す
    result = update_handler(event, context)
    
    return {
        'statusCode': 200,
        'body': json.dumps(result['body'])
    }