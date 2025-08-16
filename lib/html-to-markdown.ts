export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  
  // HTMLが既にプレーンテキストの場合はそのまま返す
  if (!html.includes('<')) {
    return html;
  }
  
  // 基本的なHTML to Markdown変換
  // 処理順序が重要: 内側の要素から外側の要素へ
  let markdown = html;
  
  // まず強調タグを処理（他のタグの中にある可能性があるため最初に）
  // 鍵括弧を含む内容も正しく処理するため、コールバック関数を使用
  markdown = markdown
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, (match, content) => {
      // デバッグ: 鍵括弧を含む強調タグの内容を確認
      if (content.includes('「') || content.includes('」')) {
        console.log('Strong tag with brackets:', content);
      }
      // 内容をそのまま保持（鍵括弧もそのまま）
      return `**${content}**`;
    })
    .replace(/<b[^>]*>(.*?)<\/b>/gis, (match, content) => {
      return `**${content}**`;
    })
    .replace(/<em[^>]*>(.*?)<\/em>/gis, (match, content) => {
      return `*${content}*`;
    })
    .replace(/<i[^>]*>(.*?)<\/i>/gis, (match, content) => {
      return `*${content}*`;
    });
  
  // リンク（強調の後に処理）
  markdown = markdown
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)');
  
  // 画像
  markdown = markdown
    .replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]+src="([^"]*)"[^>]*>/gi, '![]($1)');
  
  // コード（インラインコードを先に処理）
  markdown = markdown
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, p1) => {
      const code = p1.replace(/<[^>]+>/g, '');
      return '```\n' + code + '\n```\n\n';
    });
  
  // リスト項目
  markdown = markdown
    .replace(/<li[^>]*>(.*?)<\/li>/gis, (match, content) => {
      return '- ' + content.trim() + '\n';
    });
  
  // リストコンテナ
  markdown = markdown
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n');
  
  // 引用
  markdown = markdown
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, p1) => {
      const lines = p1.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n').trim().split('\n');
      return lines.map((line: string) => `> ${line.trim()}`).join('\n') + '\n\n';
    });
  
  // 見出し
  markdown = markdown
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // テーブル
  markdown = markdown
    .replace(/<table[^>]*>(.*?)<\/table>/gis, (match: string, tableContent: string) => {
      let result = '\n';
      
      // ヘッダー行
      const headerMatch = tableContent.match(/<thead[^>]*>(.*?)<\/thead>/is);
      if (headerMatch) {
        const headers = headerMatch[1].match(/<th[^>]*>(.*?)<\/th>/gi);
        if (headers) {
          result += '| ' + headers.map((h: string) => h.replace(/<[^>]+>/g, '').trim()).join(' | ') + ' |\n';
          result += '|' + headers.map(() => ' --- ').join('|') + '|\n';
        }
      }
      
      // ボディ行
      const bodyMatch = tableContent.match(/<tbody[^>]*>(.*?)<\/tbody>/is);
      if (bodyMatch) {
        const rows = bodyMatch[1].match(/<tr[^>]*>(.*?)<\/tr>/gis);
        if (rows) {
          rows.forEach((row: string) => {
            const cells = row.match(/<td[^>]*>(.*?)<\/td>/gi);
            if (cells) {
              result += '| ' + cells.map((c: string) => c.replace(/<[^>]+>/g, '').trim()).join(' | ') + ' |\n';
            }
          });
        }
      }
      
      return result + '\n';
    });
  
  // 改行とパラグラフ
  markdown = markdown
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '');
  
  // その他のHTMLタグを削除
  markdown = markdown
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<[^>]+>/g, '');
  
  // HTMLエンティティをデコード（日本語の記号も含む）
  markdown = markdown
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#12300;/g, '「')  // 日本語の開き鍵括弧
    .replace(/&#12301;/g, '」')  // 日本語の閉じ鍵括弧
    .replace(/&#x300c;/gi, '「')
    .replace(/&#x300d;/gi, '」');
  
  // 連続する改行を整理
  markdown = markdown
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return markdown;
}