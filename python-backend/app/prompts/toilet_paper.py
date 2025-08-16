"""
トイレットペーパー用のプロンプト定義
"""

PROMPT = """
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
   - 長さが重要：75mや100mなど、実際の1ロールの長さを正確に取得

2. まとめ買い商品の場合（「×」の後に「パック」が明記されている場合のみ）：
   - 「12ロール×6パック」→ roll_count: 72（パック数を掛ける）
   - ただし「80m×8ロール」のような場合は長さ×ロール数の表記なので、roll_count: 8

3. 長さの解釈：
   - 「50m x 12ロール」→ 1ロール50m、総数12ロール
   - 長さの単位はメートルに統一
   - mm（ミリメートル）は幅を示すので長さとして使用しない

4. ダブル/シングル判定：
   - 「2枚重ね」「ダブル」→ is_double: true
   - 「シングル」「1枚」→ is_double: false
   - 不明な場合→ is_double: null

JSONのみを返してください。説明は不要です。
"""

FIELDS = {
    'roll_count': None,
    'length_m': None,
    'is_double': None
}

def post_process(extracted_info):
    """トイレットペーパー固有の後処理"""
    # 総長さの計算
    if extracted_info['roll_count'] and extracted_info['length_m']:
        extracted_info['total_length_m'] = extracted_info['roll_count'] * extracted_info['length_m']
    else:
        extracted_info['total_length_m'] = None
    return extracted_info