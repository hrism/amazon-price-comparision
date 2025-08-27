import os
import json
import re
from typing import Dict, Optional
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def parse_mineral_water_info(title: str, description: str = "") -> Optional[Dict]:
    """
    ミネラルウォーター商品の情報をGPT-4で解析
    """
    try:
        from app.prompts.mineral_water import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
        
        prompt = USER_PROMPT_TEMPLATE.format(
            title=title,
            description=description
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=200
        )
        
        content = response.choices[0].message.content
        
        # JSON部分を抽出
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if not json_match:
            print(f"[WARNING] No JSON found in GPT response: {content}")
            return None
            
        try:
            result = json.loads(json_match.group())
            
            # 値の検証とクリーンアップ
            cleaned_result = {}
            
            # volume_ml
            if result.get('volume_ml') is not None:
                try:
                    volume = float(result['volume_ml'])
                    if volume > 0:
                        cleaned_result['volume_ml'] = int(volume)
                except (ValueError, TypeError):
                    pass
            
            # bottle_count
            if result.get('bottle_count') is not None:
                try:
                    count = int(result['bottle_count'])
                    if count > 0:
                        cleaned_result['bottle_count'] = count
                except (ValueError, TypeError):
                    pass
            
            # total_volume_ml（自動計算）
            if 'volume_ml' in cleaned_result and 'bottle_count' in cleaned_result:
                cleaned_result['total_volume_ml'] = cleaned_result['volume_ml'] * cleaned_result['bottle_count']
            elif result.get('total_volume_ml') is not None:
                try:
                    total = float(result['total_volume_ml'])
                    if total > 0:
                        cleaned_result['total_volume_ml'] = int(total)
                except (ValueError, TypeError):
                    pass
            
            return cleaned_result if cleaned_result else None
            
        except json.JSONDecodeError as e:
            print(f"[ERROR] Failed to parse JSON: {e}")
            print(f"Content: {json_match.group()}")
            return None
            
    except Exception as e:
        print(f"[ERROR] GPT parsing failed for mineral water: {str(e)}")
        return None