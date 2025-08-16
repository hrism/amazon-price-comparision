"""
価格検証システムのテストスクリプト
"""
import asyncio
from app.price_validator import PriceValidator

async def test_price_validation():
    validator = PriceValidator(variation_threshold=0.20)
    
    print("=== 価格検証テスト ===\n")
    
    # テストケース1: セールでない商品で20%以上の変動
    print("テスト1: 通常商品で25%の価格上昇")
    needs_check = validator.needs_reverification(
        current_price_per_m=2.5,
        last_price_per_m=2.0,
        on_sale=False
    )
    print(f"結果: 再検証{'必要' if needs_check else '不要'}\n")
    
    # テストケース2: セール中の商品で大幅な変動
    print("テスト2: セール商品で50%の価格下落")
    needs_check = validator.needs_reverification(
        current_price_per_m=1.0,
        last_price_per_m=2.0,
        on_sale=True
    )
    print(f"結果: 再検証{'必要' if needs_check else '不要'}（セール中は許容）\n")
    
    # テストケース3: 10%の小幅な変動
    print("テスト3: 通常商品で10%の価格変動")
    needs_check = validator.needs_reverification(
        current_price_per_m=2.2,
        last_price_per_m=2.0,
        on_sale=False
    )
    print(f"結果: 再検証{'必要' if needs_check else '不要'}\n")
    
    # テストケース4: 疑わしい価格の検出
    print("テスト4: 疑わしい価格の商品検出")
    suspicious_products = [
        {'asin': 'TEST001', 'title': 'テスト商品1', 'price_per_m': 0.5},  # 異常に安い
        {'asin': 'TEST002', 'title': 'テスト商品2', 'price_per_m': 2.5},  # 正常
        {'asin': 'TEST003', 'title': 'テスト商品3', 'price_per_m': 25.0}, # 異常に高い
    ]
    
    suspicious_list = validator.get_suspicious_products(suspicious_products)
    for item in suspicious_list:
        print(f"  - {item['title']}: ¥{item['price_per_m']}/m - {item['reason']}")
    
    print("\n=== テスト完了 ===")

if __name__ == "__main__":
    asyncio.run(test_price_validation())