import * as cheerio from 'cheerio';
import readingTime from 'reading-time';

export interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function generateTOC(htmlContent: string): TOCItem[] {
  const $ = cheerio.load(htmlContent);
  const toc: TOCItem[] = [];
  
  $('h2, h3').each((_, element) => {
    const $el = $(element);
    const text = $el.text();
    const level = element.name === 'h2' ? 2 : 3;
    
    // IDを生成（日本語対応）
    const id = text
      .toLowerCase()
      .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    
    // HTMLにIDを追加
    $el.attr('id', id);
    
    toc.push({ id, text, level });
  });
  
  return toc;
}

export function addIdsToHeadings(htmlContent: string): string {
  const $ = cheerio.load(htmlContent);
  
  $('h2, h3').each((_, element) => {
    const $el = $(element);
    const text = $el.text();
    
    // IDを生成（日本語対応）
    const id = text
      .toLowerCase()
      .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    
    $el.attr('id', id);
  });
  
  return $.html();
}

export function calculateReadingTime(htmlContent: string): number {
  const $ = cheerio.load(htmlContent);
  const text = $.text();
  
  // 日本語の文字数を考慮（日本語は1分400文字で計算）
  const japaneseCharCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
  const englishText = text.replace(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '');
  const englishWordCount = englishText.split(/\s+/).filter(word => word.length > 0).length;
  
  // 読了時間を計算
  const japaneseMinutes = Math.ceil(japaneseCharCount / 400);
  const englishMinutes = Math.ceil(englishWordCount / 200);
  
  return Math.max(1, japaneseMinutes + englishMinutes);
}