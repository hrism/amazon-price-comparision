const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const pages = [
    { url: 'http://localhost:3001/toilet-paper', name: 'トイレットペーパー' },
    { url: 'http://localhost:3001/dishwashing-liquid', name: '食器用洗剤' },
    { url: 'http://localhost:3001/mineral-water', name: 'ミネラルウォーター' },
    { url: 'http://localhost:3001/rice', name: '米' }
  ];
  
  console.log('=== 各ページの表示数確認 ===\n');
  
  for (const pageInfo of pages) {
    await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 商品カードを正しく数える
    const productCount = await page.evaluate(() => {
      // ProductCardコンポーネントを探す
      const cards = document.querySelectorAll('.bg-white.border.border-\\[\\#D5D9D9\\].rounded-2xl.p-4');
      return cards.length;
    });
    
    console.log(`【${pageInfo.name}】: ${productCount}件`);
    
    if (productCount > 20) {
      console.log('  ⚠️ 20件を超えています');
    } else if (productCount === 20) {
      console.log('  ✅ 正しく20件表示');
    } else if (productCount > 0) {
      console.log('  ✅ ${productCount}件表示（商品総数が20件未満の可能性）');
    } else {
      console.log('  ❌ 商品が表示されていません');
    }
  }
  
  await browser.close();
  console.log('\n=== 確認完了 ===');
})();