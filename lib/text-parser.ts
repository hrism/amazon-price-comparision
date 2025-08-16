// @ts-ignore
import kuromoji from 'kuromoji';
import path from 'path';

interface ExtractedData {
  rollCount: number | null;
  lengthM: number | null;
  totalLengthM: number | null;
  isDouble: boolean | null;
}

// シングルトンインスタンス
let tokenizerInstance: any = null;
let initializationPromise: Promise<any> | null = null;

class TextParser {
  async initialize() {
    if (tokenizerInstance) {
      return tokenizerInstance;
    }
    
    if (initializationPromise) {
      return await initializationPromise;
    }
    
    initializationPromise = new Promise((resolve, reject) => {
      const dictPath = path.join(process.cwd(), 'node_modules/kuromoji/dict');
      console.log('Initializing Kuromoji with dict path:', dictPath);
      
      kuromoji.builder({ dicPath: dictPath }).build((err: any, tokenizer: any) => {
        if (err) {
          console.error('Kuromoji initialization error:', err);
          initializationPromise = null;
          reject(err);
        } else {
          console.log('Kuromoji initialized successfully');
          tokenizerInstance = tokenizer;
          resolve(tokenizer);
        }
      });
    });
    
    return await initializationPromise;
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
    text = text.replace(/mm/g, 'mm');
    
    // 「長さ」の前の数値を見つけやすくする
    text = text.replace(/長さ/g, ' 長さ ');
    
    return text;
  }

  async extractProductInfo(title: string, description?: string): Promise<ExtractedData> {
    let tokenizer;
    try {
      tokenizer = await this.initialize();
    } catch (error) {
      console.error('Failed to initialize TextParser:', error);
      // Kuromojiが失敗した場合、基本的な解析を返す
      return {
        rollCount: null,
        lengthM: null,
        totalLengthM: null,
        isDouble: title.includes('ダブル') ? true : title.includes('シングル') ? false : null
      };
    }
    
    const combinedText = this.normalizeText(`${title} ${description || ''}`);
    console.log('Analyzing text:', combinedText.substring(0, 100) + '...');
    
    const tokens = tokenizer.tokenize(combinedText);
    console.log(`Tokenized into ${tokens.length} tokens`);
    
    let rollCount: number | null = null;
    let lengthM: number | null = null;
    let packCount = 1;
    let isDouble: boolean | null = null;
    let totalRollCount: number | null = null;

    // シングル/ダブル判定
    for (const token of tokens) {
      if (token.surface_form === 'ダブル' || token.basic_form === 'ダブル') {
        isDouble = true;
      } else if (token.surface_form === 'シングル' || token.basic_form === 'シングル') {
        isDouble = false;
      }
    }

    // 数値と単位のペアを探す（前後の文脈も考慮）
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // 数字を見つけたら
      if (token.pos === '名詞' && token.pos_detail_1 === '数') {
        const num = parseFloat(token.surface_form);
        
        // 前後のトークンを確認（最大3つ先まで）
        for (let j = 1; j <= 3 && i + j < tokens.length; j++) {
          const nearToken = tokens[i + j];
          const nearSurface = nearToken.surface_form;
          const nearBasic = nearToken.basic_form;
          
          // メートル数
          if (nearSurface === 'm' || nearSurface === 'M' || nearSurface === 'ｍ' || 
              nearBasic === 'メートル' || nearSurface === 'メートル') {
            // より大きな数値を長さとして採用
            if (!lengthM || num > lengthM) {
              lengthM = num;
            }
            break;
          }
          // ロール数
          else if (nearSurface === 'ロール' || nearBasic === '巻' || nearSurface === '巻' ||
                   nearSurface === 'roll' || nearSurface === 'Roll') {
            // 括弧内の場合は総ロール数として扱う
            if (i > 0 && (tokens[i-1].surface_form === '（' || tokens[i-1].surface_form === '(')) {
              totalRollCount = num;
            }
            // ×の後の数字を確認
            else if (i + j + 1 < tokens.length && 
                     (tokens[i + j + 1].surface_form === '×' || tokens[i + j + 1].surface_form === 'x')) {
              rollCount = num;
              // ×の後の数値を探す
              for (let k = i + j + 2; k < tokens.length && k < i + j + 5; k++) {
                if (tokens[k].pos === '名詞' && tokens[k].pos_detail_1 === '数') {
                  packCount = parseFloat(tokens[k].surface_form);
                  break;
                }
              }
            } else if (!rollCount) {
              rollCount = num;
            }
            break;
          }
          // パック数
          else if (nearSurface === 'パック' || nearSurface === 'セット' || nearSurface === '袋') {
            packCount = num;
            break;
          }
        }
      }
    }

    // 総ロール数の計算
    // 括弧内の総ロール数があればそれを優先
    const totalRolls = totalRollCount || (rollCount ? rollCount * packCount : null);
    
    // 総メートル数の計算
    const totalLengthM = totalRolls && lengthM ? totalRolls * lengthM : null;

    const result = {
      rollCount: totalRolls,
      lengthM,
      totalLengthM,
      isDouble
    };
    
    console.log('Extraction result:', result);
    
    return result;
  }
}

export default TextParser;