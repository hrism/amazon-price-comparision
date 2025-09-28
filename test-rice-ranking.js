const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // 米ページを開く
  await page.goto('http://localhost:3002/rice', { waitUntil: 'networkidle2' });
  
  // 商品が読み込まれるまで待機
  await page.waitForSelector('.space-y-3', { timeout: 10000 });
  
  // デフォルト（総合点順）の上位3商品を取得
  const totalScoreProducts = await page.evaluate(() => {
    const products = Array.from(document.querySelectorAll('.space-y-3 > div')).slice(0, 3);
    return products.map(p => {
      const title = p.querySelector('h3')?.textContent?.trim() || '';
      const pricePerKg = p.querySelector('[class*="text-\\[18px\\]"]')?.textContent?.replace(/[^0-9]/g, '') || '';
      return { title: title.substring(0, 50), pricePerKg };
    });
  });
  
  console.log('総合点が高い順（デフォルト）:');
  totalScoreProducts.forEach((p, i) => {
    console.log(`${i+1}. ${p.title}... - ¥${p.pricePerKg}/kg`);
  });
  
  // ソートセレクタをクリックして単価順に変更
  await page.select('select', 'price_per_kg');
  
  // 再レンダリングを待つ
  await page.waitForTimeout(1000);
  
  // 単価順の上位3商品を取得
  const priceProducts = await page.evaluate(() => {
    const products = Array.from(document.querySelectorAll('.space-y-3 > div')).slice(0, 3);
    return products.map(p => {
      const title = p.querySelector('h3')?.textContent?.trim() || '';
      const pricePerKg = p.querySelector('[class*="text-\\[18px\\]"]')?.textContent?.replace(/[^0-9]/g, '') || '';
      return { title: title.substring(0, 50), pricePerKg };
    });
  });
  
  console.log('\n単価が安い順:');
  priceProducts.forEach((p, i) => {
    console.log(`${i+1}. ${p.title}... - ¥${p.pricePerKg}/kg`);
  });
  
  // 違いがあるか確認
  const isSame = JSON.stringify(totalScoreProducts) === JSON.stringify(priceProducts);
  console.log(`\n結果: ${isSame ? '⚠️ 同じ順序です' : '✅ 異なる順序です'}`);
  
  await browser.close();
})();
