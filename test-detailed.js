const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // コンソールログを出力
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ ブラウザエラー:', msg.text());
    }
  });
  
  const pages = [
    { url: 'https://www.yasu-ku-kau.com/toilet-paper', name: 'トイレットペーパー', api: '/api/search?keyword=%E3%83%88%E3%82%A4%E3%83%AC%E3%83%83%E3%83%88%E3%83%9A%E3%83%BC%E3%83%91%E3%83%BC' },
    { url: 'https://www.yasu-ku-kau.com/dishwashing-liquid', name: '食器用洗剤', api: '/api/dishwashing-liquid/search?keyword=%E9%A3%9F%E5%99%A8%E7%94%A8%E6%B4%97%E5%89%A4' },
  ];
  
  console.log('=== 詳細確認 ===\n');
  
  for (const pageInfo of pages) {
    console.log(`\n【${pageInfo.name}】`);
    
    // API直接確認
    const apiResponse = await page.evaluate(async (apiPath) => {
      const res = await fetch(`https://www.yasu-ku-kau.com${apiPath}`);
      const data = await res.json();
      return {
        status: res.status,
        productCount: data.products ? data.products.length : 0,
        lastUpdate: data.lastUpdate
      };
    }, pageInfo.api);
    
    console.log(`API応答: ${apiResponse.status}, 商品数: ${apiResponse.productCount}件`);
    console.log(`API最終更新: ${apiResponse.lastUpdate}`);
    
    // ページ表示確認
    await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // ページネーションの確認
    const hasMoreButton = await page.locator('button:has-text("もっと見る")').count();
    const hasPagination = await page.locator('[class*="pagination"], [class*="Pagination"]').count();
    
    console.log(`もっと見るボタン: ${hasMoreButton > 0 ? 'あり' : 'なし'}`);
    console.log(`ページネーション: ${hasPagination > 0 ? 'あり' : 'なし'}`);
    
    // 実際の表示商品数
    const visibleProducts = await page.evaluate(() => {
      const cards = document.querySelectorAll('article, [class*="product"], [class*="card"]');
      return Array.from(cards).filter(el => {
        const text = el.textContent || '';
        return text.includes('円') || text.includes('¥');
      }).length;
    });
    
    console.log(`実際の表示商品数: ${visibleProducts}件`);
    
    // スクロールして追加読み込みを確認
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    const afterScrollProducts = await page.evaluate(() => {
      const cards = document.querySelectorAll('article, [class*="product"], [class*="card"]');
      return Array.from(cards).filter(el => {
        const text = el.textContent || '';
        return text.includes('円') || text.includes('¥');
      }).length;
    });
    
    console.log(`スクロール後の商品数: ${afterScrollProducts}件`);
    
    if (apiResponse.productCount > 10 && visibleProducts < 10) {
      console.log('⚠️ APIは多数の商品を返していますが、表示数が少なすぎます');
    }
  }
  
  await browser.close();
  console.log('\n=== 確認完了 ===');
})();