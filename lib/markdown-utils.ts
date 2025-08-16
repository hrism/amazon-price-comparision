// MDXEditorでの鍵括弧と太字の問題を解決するためのユーティリティ

/**
 * MDXEditor用にMarkdownをエスケープ
 * 鍵括弧を含む太字を特殊な形式に変換
 */
export function escapeMarkdownForEditor(markdown: string): string {
  // **「...」** のパターンを検出して特殊マーカーに置換
  return markdown.replace(/\*\*([「」].*?[「」])\*\*/g, (match, content) => {
    // 太字の中の鍵括弧を含む内容を保護
    return `__BOLD_START__${content}__BOLD_END__`;
  });
}

/**
 * エディタから取得したMarkdownを元に戻す
 */
export function unescapeMarkdownFromEditor(markdown: string): string {
  // 特殊マーカーを元の太字形式に戻す
  return markdown.replace(/__BOLD_START__(.*?)__BOLD_END__/g, (match, content) => {
    return `**${content}**`;
  });
}

/**
 * MDXEditorが正しく処理できるように鍵括弧を含む太字を修正
 */
export function fixBoldWithBrackets(markdown: string): string {
  // 鍵括弧を含む太字を検出
  const lines = markdown.split('\n');
  const fixedLines = lines.map(line => {
    // **「で始まり」**で終わるパターンを修正
    if (line.includes('**「') && line.includes('」**')) {
      // 一度太字を解除してから、全体を太字にする
      const fixed = line.replace(/\*\*「(.*?)」\*\*/g, (match, content) => {
        // 内容全体を太字にする（鍵括弧も含めて）
        return `**「${content}」**`;
      });
      return fixed;
    }
    return line;
  });
  
  return fixedLines.join('\n');
}