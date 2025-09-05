const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== 正しいテスト ===\n');
  
  await page.goto('http://localhost:3003/toilet-paper', { waitUntil: 'networkidle' });
  
  // 5秒待機
  await page.waitForTimeout(5000);
  
  // 実際の商品カードを正しく数える
  const productInfo = await page.evaluate(() => {
    // ProductCardコンポーネントを探す
    const cards = document.querySelectorAll('.bg-white.border.border-\\[\\#D5D9D9\\].rounded-2xl.p-4');
    
    // 商品情報テキストも確認
    const productTexts = Array.from(cards).slice(0, 5).map(card => {
      const title = card.querySelector('h3')?.textContent || '';
      return title.substring(0, 30);
    });
    
    return {
      count: cards.length,
      samples: productTexts
    };
  });
  
  console.log(`表示商品数: ${productInfo.count}件`);
  console.log('最初の5商品:');
  productInfo.samples.forEach((title, i) => {
    console.log(`  ${i + 1}. ${title}...`);
  });
  
  // 10秒待機
  console.log('\n10秒間ブラウザを開いたままにします...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('=== テスト完了 ===');
})();