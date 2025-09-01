RICE_EXTRACTION_PROMPT = """
以下のHTMLから米商品の情報を抽出してください。

抽出する情報：
- ASIN（商品ID）
- title（商品名）
- brand（ブランド名）
- price（通常配送の現在価格）
- price_regular（通常配送の定価）
- price_fresh（Amazon Freshの価格、ある場合）
- price_fresh_regular（Amazon Freshの定価、ある場合）
- is_fresh_available（Fresh配送が利用可能か：true/false）
- review_avg（評価平均）
- review_count（レビュー数）
- image_url（商品画像URL）
- description（商品説明、あれば）
- weight_kg（内容量：kg単位、例：5kg→5、10kg→10）
- price_per_kg（通常価格での1kgあたりの価格）
- price_per_kg_fresh（Fresh価格での1kgあたりの価格、ある場合）
- rice_type（米の種類：例：コシヒカリ、あきたこまち、等）
- is_musenmai（無洗米かどうか：true/false）
- discount_percent（割引率、通常配送）
- discount_percent_fresh（割引率、Fresh配送）

重要な注意事項：
1. Amazon Freshの価格が表示されている場合、両方の価格を取得
2. 価格表示が「￥XXX (Fresh)」のような形式の場合はFresh価格として扱う
3. weight_kgは商品タイトルや説明から数値として抽出（単位はkg）
4. price_per_kgは price / weight_kg で計算（通常配送とFreshそれぞれ）
5. rice_typeは商品名から品種名を抽出
6. is_musenmaiは商品名に「無洗米」が含まれていればtrue
7. 通常配送価格が取得できない商品は除外（Fresh価格のみの商品も含む）
8. 定期おトク便価格は別フィールドで保持（実装する場合）

JSON形式で返してください。
"""

# 1kgあたりの価格を計算する関数
def calculate_price_per_kg(price: float, weight_kg: float) -> float:
    """1kgあたりの価格を計算"""
    if weight_kg and weight_kg > 0:
        return round(price / weight_kg, 2)
    return None

# 商品タイトルから重量を抽出する関数
def extract_weight_from_title(title: str) -> float:
    """商品タイトルから重量（kg）を抽出"""
    import re
    
    # まず「×数＝合計kg」のパターンをチェック（例：5kg×4＝20kg）
    multiplication_pattern = r'(\d+(?:\.\d+)?)\s*kg?\s*[×x]\s*(\d+)\s*[=＝]\s*(\d+(?:\.\d+)?)\s*kg'
    mult_match = re.search(multiplication_pattern, title, re.IGNORECASE)
    if mult_match:
        # 合計重量を返す
        return float(mult_match.group(3))
    
    # 次に「合計重量kg（内訳）」のパターンをチェック（例：10kg（5kg×2）)
    total_first_pattern = r'(\d+(?:\.\d+)?)\s*kg\s*[（\(].*[×x].*[）\)]'
    total_match = re.search(total_first_pattern, title, re.IGNORECASE)
    if total_match:
        return float(total_match.group(1))
    
    # 通常のパターン: 数字+kg または 数字+キロ
    patterns = [
        r'(\d+(?:\.\d+)?)\s*kg',
        r'(\d+(?:\.\d+)?)\s*キロ',
        r'(\d+(?:\.\d+)?)\s*㎏'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            return float(match.group(1))
    
    return None

# 商品タイトルから米の品種を抽出する関数
def extract_rice_type(title: str) -> str:
    """商品タイトルから米の品種を抽出"""
    # 一般的な米の品種リスト
    rice_types = [
        'コシヒカリ', 'こしひかり',
        'あきたこまち', '秋田小町',
        'ひとめぼれ', 
        'はえぬき',
        'ななつぼし',
        'ゆめぴりか',
        'つや姫',
        'ミルキークイーン',
        'きぬむすめ',
        'にこまる',
        'ヒノヒカリ',
        'あさひの夢',
        'きらら397',
        '森のくまさん',
        'さがびより'
    ]
    
    title_lower = title.lower()
    for rice_type in rice_types:
        if rice_type.lower() in title_lower:
            return rice_type
    
    return None

# 無洗米かどうかを判定する関数  
def is_musenmai(title: str) -> bool:
    """商品名から無洗米かどうかを判定"""
    musenmai_keywords = ['無洗米', 'むせんまい', '無洗']
    title_lower = title.lower()
    return any(keyword in title or keyword.lower() in title_lower for keyword in musenmai_keywords)