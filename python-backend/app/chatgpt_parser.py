import os
from openai import AsyncOpenAI
from typing import Dict, Optional, Any
import json
import re
from app.prompts import toilet_paper, dishwashing_liquid

class ChatGPTParser:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def _extract_with_prompt(self, title: str, description: str, 
                                   prompt_template: str, expected_fields: Dict[str, Any],
                                   product_type: str) -> Dict[str, Any]:
        """共通の抽出処理"""
        combined_text = f"商品名: {title}\n商品説明: {description}"
        prompt = prompt_template.format(combined_text=combined_text)
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "あなたは商品情報を正確に抽出する専門家です。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=200
            )
            
            content = response.choices[0].message.content
            
            # JSON部分のみを抽出
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(content)
            
            # 期待されるフィールドのみを返す（デフォルト値付き）
            extracted = {}
            for field, default_value in expected_fields.items():
                extracted[field] = result.get(field, default_value)
            
            print(f"{product_type} extracted from '{title[:50]}...': {extracted}")
            return extracted
            
        except Exception as e:
            print(f"ChatGPT extraction error for {product_type}: {str(e)}")
            # エラー時はデフォルト値を返す
            return expected_fields.copy()
    
    async def extract_info(self, title: str, description: str = '') -> Dict[str, Optional[float]]:
        """トイレットペーパーの商品情報を抽出"""
        extracted_info = await self._extract_with_prompt(
            title, description, 
            toilet_paper.PROMPT, 
            toilet_paper.FIELDS,
            "Toilet paper"
        )
        return toilet_paper.post_process(extracted_info)
    
    async def extract_dishwashing_info(self, title: str, description: str = '') -> Dict[str, Any]:
        """食器用洗剤の商品情報を抽出"""
        extracted_info = await self._extract_with_prompt(
            title, description,
            dishwashing_liquid.PROMPT,
            dishwashing_liquid.FIELDS,
            "Dishwashing liquid"
        )
        return dishwashing_liquid.post_process(extracted_info)
    
    async def close(self):
        """リソースのクリーンアップ"""
        pass