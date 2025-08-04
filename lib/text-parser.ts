import kuromoji from 'kuromoji';
import path from 'path';

interface ExtractedData {
  rollCount: number | null;
  lengthM: number | null;
  totalLengthM: number | null;
  isDouble: boolean | null;
}

class TextParser {
  private tokenizer: any;

  async initialize() {
    if (!this.tokenizer) {
      return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: path.join(process.cwd(), 'node_modules/kuromoji/dict') }).build((err: any, tokenizer: any) => {
          if (err) {
            reject(err);
          } else {
            this.tokenizer = tokenizer;
            resolve(tokenizer);
          }
        });
      });
    }
  }

  private normalizeText(text: string): string {
    // 全角数字を半角に変換
    text = text.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    
    // 記号の統一
    text = text.replace(/[×✕ｘＸ]/g, '×');
    text = text.replace(/[・･]/g, '・');
    
    // 単位の統一
    text = text.replace(/巻き?/g, 'ロール');
    text = text.replace(/個入り?/g, 'ロール');
    text = text.replace(/メートル/g, 'm');
    text = text.replace(/ｍ/g, 'm');
    
    return text;
  }

  async extractProductInfo(title: string, description?: string): Promise<ExtractedData> {
    await this.initialize();
    
    const combinedText = this.normalizeText(`${title} ${description || ''}`);
    const tokens = this.tokenizer.tokenize(combinedText);
    
    let rollCount: number | null = null;
    let lengthM: number | null = null;
    let packCount = 1;
    let isDouble: boolean | null = null;

    // シングル/ダブル判定
    if (combinedText.includes('ダブル') || combinedText.toLowerCase().includes('double')) {
      isDouble = true;
    } else if (combinedText.includes('シングル') || combinedText.toLowerCase().includes('single')) {
      isDouble = false;
    }

    // 数値と単位のペアを探す
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // 数字を見つけたら
      if (token.pos === '名詞' && token.pos_detail_1 === '数') {
        const num = parseFloat(token.surface_form);
        
        // 次のトークンを確認
        if (i + 1 < tokens.length) {
          const nextToken = tokens[i + 1];
          const nextSurface = nextToken.surface_form;
          
          // メートル数
          if (nextSurface === 'm' || nextSurface === 'M') {
            lengthM = num;
          }
          // ロール数
          else if (nextSurface.includes('ロール') || nextSurface === '巻') {
            // パック表記があるか確認
            if (i + 2 < tokens.length && tokens[i + 2].surface_form === '×' && i + 3 < tokens.length) {
              const packNumToken = tokens[i + 3];
              if (packNumToken.pos === '名詞' && packNumToken.pos_detail_1 === '数') {
                rollCount = num;
                packCount = parseFloat(packNumToken.surface_form);
              }
            } else {
              rollCount = num;
            }
          }
          // パック数
          else if (nextSurface.includes('パック') || nextSurface === 'P') {
            packCount = num;
          }
        }
      }
    }

    // パターンマッチングでも試す
    const patterns = [
      // 12ロール×4パック
      /(\d+)\s*ロール\s*[×x]\s*(\d+)\s*パック/,
      // 50m×12ロール
      /(\d+)\s*m\s*[×x]\s*(\d+)\s*ロール/,
      // 75mダブル
      /(\d+)\s*m/,
      // 12ロール
      /(\d+)\s*ロール/,
    ];

    for (const pattern of patterns) {
      const match = combinedText.match(pattern);
      if (match) {
        if (pattern.source.includes('ロール.*パック')) {
          rollCount = rollCount || parseInt(match[1]);
          packCount = parseInt(match[2]);
        } else if (pattern.source.includes('m.*ロール')) {
          lengthM = lengthM || parseInt(match[1]);
          rollCount = rollCount || parseInt(match[2]);
        } else if (pattern.source.includes('m')) {
          lengthM = lengthM || parseInt(match[1]);
        } else if (pattern.source.includes('ロール')) {
          rollCount = rollCount || parseInt(match[1]);
        }
      }
    }

    // 総ロール数の計算
    const totalRolls = rollCount ? rollCount * packCount : null;
    
    // 総メートル数の計算
    const totalLengthM = totalRolls && lengthM ? totalRolls * lengthM : null;

    return {
      rollCount: totalRolls,
      lengthM,
      totalLengthM,
      isDouble
    };
  }
}

export default TextParser;