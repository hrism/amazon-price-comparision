const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const pages = [
    { url: 'http://localhost:3003/toilet-paper', name: 'トイレットペーパー' },
    { url: 'http://localhost:3003/dishwashing-liquid', name: '食器用洗剤' },
    { url: 'http://localhost:3003/mineral-water', name: 'ミネラルウォーター' },
    { url: 'http://localhost:3003/rice', name: '米' }
  ];
  
  console.log('=== ローカル全商材確認 ===\n');
  
  for (const pageInfo of pages) {
    await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 商品カード数を数える
    const productCount = await page.evaluate(() => {
      // 複数のセレクタを試す
      const cards = document.querySelectorAll('article, .bg-white.rounded-lg.shadow, [class*="product"]');
      return Array.from(cards).filter(el => {
        const text = el.textContent || '';
        return text.includes('円') || text.includes('¥');
      }).length;
    });
    
    // フィルター情報を取得
    const filterInfo = await page.locator('text=/件の商品/').textContent().catch(() => '取得失敗');
    
    console.log(`【${pageInfo.name}】`);
    console.log(`  表示商品数: ${productCount}件`);
    console.log(`  フィルター情報: ${filterInfo}`);
    
    if (productCount === 0) {
      console.log('  ❌ 商品が表示されていません');
    } else if (productCount < 10 && filterInfo.includes('件')) {
      const expectedCount = parseInt(filterInfo.match(/(\d+)件/)?.[1] || '0');
      if (expectedCount > 10 && productCount < 10) {
        console.log(`  ⚠️ 期待: ${expectedCount}件, 実際: ${productCount}件`);
      }
    }
  }
  
  await browser.close();
  console.log('\n=== 確認完了 ===');
})();