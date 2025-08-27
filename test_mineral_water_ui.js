const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3001/mineral-water', { waitUntil: 'networkidle2', timeout: 10000 });
  
  // Wait for products to load
  await page.waitForSelector('.grid', { timeout: 5000 }).catch(() => {});
  
  // Check if products are displayed
  const productCount = await page.$$eval('.grid > a', elements => elements.length);
  console.log(`Products displayed: ${productCount}`);
  
  // Check for loading state
  const hasLoadingText = await page.$eval('body', body => body.textContent.includes('読み込み中'));
  console.log(`Still loading: ${hasLoadingText}`);
  
  // Get first product card details if available
  const firstProduct = await page.$eval('.grid > a:first-child', el => {
    const title = el.querySelector('h3')?.textContent || 'No title';
    const price = el.querySelector('[class*="text-2xl"]')?.textContent || 'No price';
    const unitPrice = Array.from(el.querySelectorAll('div')).find(div => 
      div.textContent.includes('/L')
    )?.textContent || 'No unit price';
    return { title, price, unitPrice };
  }).catch(() => ({ error: 'No products found' }));
  
  console.log('First product:', JSON.stringify(firstProduct, null, 2));
  
  // Check header presence
  const hasHeader = await page.$('.border-b.border-gray-300') !== null;
  console.log(`ProductPageHeader present: ${hasHeader}`);
  
  await browser.close();
})();
