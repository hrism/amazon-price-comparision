"""
食器用洗剤用のプロンプト定義
"""

PROMPT = """
以下の食器用洗剤商品情報から、正確な情報を抽出してください。

{combined_text}

以下の情報をJSON形式で返してください：
- volume_ml: 容量（ミリリットル単位、数値のみ）
- is_refill: 詰め替え用かどうか（true/false）
- is_dishwasher: 食洗機用かどうか（true/false）

重要な注意事項：
1. 容量の解釈：
   - 「400ml」→ volume_ml: 400
   - 「1.5L」→ volume_ml: 1500
   - 「800g」→ 液体洗剤の重量表記の場合は同じ数値をmlとして扱う（volume_ml: 800）
   - まとめ買いの場合は総容量を返す（例：「950ml×3個」→ volume_ml: 2850）
   - タブレット・キューブ・粉末の個数は容量として扱わない（例：「60個」→ volume_ml: null）

2. 詰め替え判定：
   - 「詰め替え」「詰替」「つめかえ」「レフィル」→ is_refill: true
   - 「本体」「ボトル」または詰め替えの記載がない→ is_refill: false

3. 食洗機用判定（最重要）：
   **タイトルに以下のいずれかが含まれていたら必ず is_dishwasher: true にしてください：**
   - 「食洗機」「食洗器」「食器洗い機」「食器洗い乾燥機」
   - 「dishwasher」「DISHWASHER」 
   - 「タブレット」「キューブ」「ジェルタブ」「パワーボール」（洗剤の形状として）
   - 「フィニッシュ」「Finish」「FINISH」（ブランド名）
   - 上記のどれも含まれていない場合のみ → is_dishwasher: false

例1：
入力: "ジョイ W除菌 食器用洗剤 詰め替え 特大 770ml"
出力: {{"volume_ml": 770, "is_refill": true, "is_dishwasher": false}}

例2：
入力: "フィニッシュ 食洗機 洗剤 タブレット パワーキューブ 60個"
出力: {{"volume_ml": null, "is_refill": false, "is_dishwasher": true}}
理由: タイトルに「食洗機」と「フィニッシュ」と「タブレット」が含まれているため

例3：
入力: "チャーミーマジカ 速乾+ 詰替用大型 950ml×3個"
出力: {{"volume_ml": 2850, "is_refill": true, "is_dishwasher": false}}

JSONのみを返してください。説明は不要です。
"""

FIELDS = {
    'volume_ml': None,
    'is_refill': False,
    'is_dishwasher': False
}

def post_process(extracted_info):
    """食器用洗剤固有の後処理（現在は特になし）"""
    return extracted_info