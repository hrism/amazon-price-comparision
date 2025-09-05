const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const pages = [
    { url: 'https://www.yasu-ku-kau.com/toilet-paper', name: 'トイレットペーパー' },
    { url: 'https://www.yasu-ku-kau.com/dishwashing-liquid', name: '食器用洗剤' },
    { url: 'https://www.yasu-ku-kau.com/mineral-water', name: 'ミネラルウォーター' },
    { url: 'https://www.yasu-ku-kau.com/rice', name: '米' }
  ];
  
  console.log('=== 全商材ページ確認 ===\n');
  
  for (const pageInfo of pages) {
    console.log(`\n【${pageInfo.name}】`);
    console.log(`URL: ${pageInfo.url}`);
    
    try {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      
      // ローディング状態が終わるまで待つ（最大15秒）
      await page.waitForTimeout(3000); // 初期ロードを待つ
      
      // ローディングスケルトンが消えるのを待つ
      await page.waitForFunction(
        () => document.querySelectorAll('.animate-pulse').length === 0,
        { timeout: 15000 }
      ).catch(() => console.log('⚠️ ローディングがタイムアウト'));
      
      // 商品数を取得（複数のセレクタを試す）
      const productCount = await page.locator('[data-testid="product-card"], .product-card, article, .bg-white.rounded-lg.shadow').count();
      console.log(`表示商品数: ${productCount}件`);
      
      // 最終更新日時を取得
      const updateInfo = await page.locator('text=/最終更新/').textContent().catch(() => '取得失敗');
      if (updateInfo && updateInfo !== '取得失敗') {
        console.log(`更新情報: ${updateInfo.trim()}`);
      }
      
      // APIエラーメッセージの有無を確認
      const errorMessage = await page.locator('text=/エラー|失敗|Failed/i').count();
      if (errorMessage > 0) {
        console.log('❌ エラーメッセージが表示されています');
      } else {
        console.log('✅ 正常に表示されています');
      }
      
    } catch (error) {
      console.log(`❌ ページ読み込みエラー: ${error.message}`);
    }
  }
  
  await browser.close();
  console.log('\n=== 確認完了 ===');
})();