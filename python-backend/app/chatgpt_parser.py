import os
from openai import AsyncOpenAI
from typing import Dict, Optional
import json

class ChatGPTParser:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def extract_info(self, title: str, description: str = '') -> Dict[str, Optional[float]]:
        """ChatGPT APIを使用してトイレットペーパーの商品情報を抽出"""
        
        combined_text = f"商品名: {title}\n商品説明: {description}"
        
        prompt = f"""
以下のトイレットペーパー商品情報から、正確な情報を抽出してください。

{combined_text}

以下の情報をJSON形式で返してください：  
- roll_count: 実際の物理的なロール数（数値のみ、単位なし）
- length_m: 1ロールあたりの長さ（メートル単位、数値のみ）
- is_double: ダブルかシングルか（true/false/null）

重要な注意事項：
1. 「2倍巻」「3倍巻」「長持ち」商品の場合：
   - 物理的なロール数を使用してください（換算値ではない）
   - 「3倍長持ち 12ロール」→ roll_count: 12（物理的に12ロール）
   - 「2倍巻き 8ロール」→ roll_count: 8（物理的に8ロール）
   - 長さが重要：75mや100mなど、実際の1ロールの長さを正確に取得

2. まとめ買い商品の場合（「×」の後に「パック」が明記されている場合のみ）：
   - 「12ロール×6パック」→ roll_count: 72（パック数を掛ける）
   - 「8ロール×8パック」→ roll_count: 64（パック数を掛ける）
   - ただし「80m×8ロール」のような場合は長さ×ロール数の表記なので、roll_count: 8
   - 「8ロール」「×8」と別々に書かれている場合も、パックの記載がなければ roll_count: 8

3. 長さの解釈：
   - 「50m x 12ロール」→ 1ロール50m、総数12ロール
   - 長さの単位はメートルに統一（例：43.18m）
   - mm（ミリメートル）は幅を示すので長さとして使用しない

4. ダブル/シングル判定：
   - 「2枚重ね」「ダブル」→ is_double: true
   - 「シングル」「1枚」→ is_double: false
   - 不明な場合→ is_double: null

例1：
入力: "by Amazon トイレットペーパー 長さ2倍巻 50m x 12ロール ダブル 単品 (12ロールで24ロール分)"
出力: {{"roll_count": 12, "length_m": 50, "is_double": true}}
説明: 物理的12ロール、1ロール50m

例2：
入力: "スコッティ フラワーパック 3倍長持ち 75m×12ロール (12ロールで36ロール分)"
出力: {{"roll_count": 12, "length_m": 75, "is_double": true}}
説明: 物理的12ロール、1ロール75m

例3：
入力: "エリエール 25m×72ロール(12ロール×6パック) ダブル"
出力: {{"roll_count": 72, "length_m": 25, "is_double": true}}
説明: まとめ買いで物理的に72ロール（通常巻き）

例4：
入力: "エリエール トイレットペーパー i:na(イーナ) 3.2倍巻き 80m×8ロール ダブル"
出力: {{"roll_count": 8, "length_m": 80, "is_double": true}}
説明: 物理的8ロール、1ロール80m

例5：
入力: "エリエール i:na 8ロール ×8"
出力: {{"roll_count": 8, "length_m": null, "is_double": null}}
説明: パックの記載がないので物理的8ロール（×8は無視）

JSONのみを返してください。説明は不要です。
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=200
            )
            
            content = response.choices[0].message.content.strip()
            
            # JSONパースを試行
            try:
                result = json.loads(content)
                
                # 結果の初期化
                extracted_info = {
                    'roll_count': result.get('roll_count'),
                    'length_m': result.get('length_m'),
                    'total_length_m': None,
                    'is_double': result.get('is_double')
                }
                
                # 総長さの計算
                if extracted_info['roll_count'] and extracted_info['length_m']:
                    extracted_info['total_length_m'] = extracted_info['roll_count'] * extracted_info['length_m']
                
                print(f"ChatGPT extracted from '{title[:50]}...': {extracted_info}")
                return extracted_info
                
            except json.JSONDecodeError as e:
                print(f"ChatGPT JSON parse error: {e}, content: {content}")
                return {
                    'roll_count': None,
                    'length_m': None,
                    'total_length_m': None,
                    'is_double': None
                }
                
        except Exception as e:
            print(f"ChatGPT API error: {str(e)}")
            return {
                'roll_count': None,
                'length_m': None,
                'total_length_m': None,
                'is_double': None
            }
    
    async def close(self):
        """リソースのクリーンアップ"""
        pass