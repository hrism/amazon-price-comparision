from openai import OpenAI
from typing import Dict, Optional
import json
import os
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

class TextParser:
    def __init__(self):
        print("Initializing OpenAI client...")
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=api_key)
        print("OpenAI client initialized successfully")
    
    def _normalize_text(self, text: str) -> str:
        """テキストの正規化"""
        # 全角数字を半角に
        text = text.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
        # 単位の統一
        text = text.replace('巻き', 'ロール').replace('巻', 'ロール')
        text = text.replace('個入り', 'ロール').replace('個入', 'ロール')
        text = text.replace('メートル', 'm')
        return text
    
    async def extract_info(self, title: str, description: str = '') -> Dict[str, Optional[float]]:
        """商品情報をChatGPT APIで抽出"""
        combined_text = f"{title} {description}"
        
        prompt = f"""
以下のトイレットペーパーの商品情報から、以下の情報を抽出してJSON形式で回答してください：

1. roll_count: 総ロール数（パック数×1パックのロール数、または括弧内の総数）
2. length_m: 1ロールあたりの長さ（メートル）
3. total_length_m: 総長さ（総ロール数×1ロールの長さ）
4. is_double: ダブル（2枚重ね）ならtrue、シングル（1枚）ならfalse、不明ならnull

商品情報：
{combined_text}

注意事項：
- 「6ロール×8パック」なら roll_count は 48
- 「(48ロール)」のような括弧内の数字があればそれを優先
- 「42.9m」「長さ42.9m」などから長さを抽出
- 数値が見つからない項目は null にする
- 必ずJSON形式のみで回答してください

{{
  "roll_count": 数値またはnull,
  "length_m": 数値またはnull,
  "total_length_m": 数値またはnull,
  "is_double": true/false/null
}}
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "あなたは商品情報を正確に抽出する専門家です。必ずJSON形式で回答してください。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0,
                max_tokens=200
            )
            
            content = response.choices[0].message.content
            if not content:
                raise Exception("No response from OpenAI")
            
            # JSONを抽出してパース
            json_match = content.strip()
            if json_match.startswith('```json'):
                json_match = json_match[7:-3].strip()
            elif json_match.startswith('```'):
                json_match = json_match[3:-3].strip()
            
            result = json.loads(json_match)
            
            # 総長さの計算（必要に応じて）
            if result.get('roll_count') and result.get('length_m') and not result.get('total_length_m'):
                result['total_length_m'] = result['roll_count'] * result['length_m']
            
            print(f"Extracted from '{title[:50]}...': {result}")
            return result
            
        except Exception as e:
            print(f"OpenAI API error: {e}")
            # フォールバック処理
            return {
                'roll_count': None,
                'length_m': None,
                'total_length_m': None,
                'is_double': True if 'ダブル' in combined_text else False if 'シングル' in combined_text else None
            }
    
    async def close(self):
        """リソースのクリーンアップ"""
        pass