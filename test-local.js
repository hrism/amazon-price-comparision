const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== ローカル環境テスト (localhost:3003) ===\n');
  
  // デバッグ情報を収集
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ コンソールエラー:', msg.text());
    }
  });
  
  await page.goto('http://localhost:3003/toilet-paper', { waitUntil: 'networkidle' });
  
  // 3秒待機
  await page.waitForTimeout(3000);
  
  // ローディングが終わるまで待つ
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-pulse').length === 0,
    { timeout: 10000 }
  ).catch(() => console.log('⚠️ ローディングがタイムアウト'));
  
  // 商品数カウント
  const productCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('article, .bg-white.rounded-lg.shadow');
    return cards.length;
  });
  
  console.log(`表示商品数: ${productCount}件`);
  
  // フィルター状態を確認
  const filterText = await page.locator('text=/件の商品/').textContent().catch(() => null);
  if (filterText) {
    console.log(`フィルター情報: ${filterText}`);
  }
  
  // APIレスポンスを直接確認
  const apiData = await page.evaluate(async () => {
    const res = await fetch('/api/search?keyword=%E3%83%88%E3%82%A4%E3%83%AC%E3%83%83%E3%83%88%E3%83%9A%E3%83%BC%E3%83%91%E3%83%BC&filter=double');
    const data = await res.json();
    return {
      total: data.products ? data.products.length : 0,
      firstProduct: data.products ? data.products[0] : null
    };
  });
  
  console.log(`API商品数: ${apiData.total}件`);
  if (apiData.firstProduct) {
    console.log(`最初の商品: ASIN=${apiData.firstProduct.asin}, price_per_m=${apiData.firstProduct.price_per_m}`);
  }
  
  // 10秒待機して手動確認
  console.log('\n10秒間ブラウザを開いたままにします...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('=== テスト完了 ===');
})();