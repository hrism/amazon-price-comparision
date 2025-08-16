import OpenAI from 'openai';

interface ExtractedData {
  rollCount: number | null;
  lengthM: number | null;
  totalLengthM: number | null;
  isDouble: boolean | null;
}

class GPTTextParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extractProductInfo(title: string, description?: string): Promise<ExtractedData> {
    try {
      const combinedText = `${title} ${description || ''}`;
      
      const prompt = `以下のトイレットペーパー商品の説明から、以下の情報を抽出してJSON形式で返してください：
1. rollCount: 総ロール数（パック数×1パックのロール数、または括弧内の総数）
2. lengthM: 1ロールあたりの長さ（メートル）
3. totalLengthM: 総長さ（総ロール数×1ロールの長さ）
4. isDouble: ダブル（2枚重ね）ならtrue、シングル（1枚）ならfalse、不明ならnull

商品説明：
${combinedText}

注意事項：
- 「6ロール×8パック」なら rollCount は 48
- 「(48ロール)」のような括弧内の数字があればそれを優先
- 「42.9m」「長さ42.9m」などから長さを抽出
- 数値が見つからない項目は null にする

必ずJSON形式で返してください。`;

      console.log('GPT API Request for:', title.substring(0, 50) + '...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'あなたは商品情報を正確に抽出する専門家です。必ずJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0, // 確定的な出力のため
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      console.log('GPT Response:', content);

      if (!content) {
        throw new Error('No response from GPT');
      }

      // JSONを抽出してパース
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        rollCount: result.rollCount || null,
        lengthM: result.lengthM || null,
        totalLengthM: result.totalLengthM || null,
        isDouble: result.isDouble !== undefined ? result.isDouble : null
      };

    } catch (error) {
      console.error('GPT parsing error:', error);
      // エラー時は基本的な解析を返す
      return {
        rollCount: null,
        lengthM: null,
        totalLengthM: null,
        isDouble: title.includes('ダブル') ? true : title.includes('シングル') ? false : null
      };
    }
  }
}

export default GPTTextParser;