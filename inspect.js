/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle' });
  
  // Wait for table to load
  await page.waitForSelector('.ant-table-row');
  
  // Get first row
  const row = await page.$('.ant-table-row');
  
  // Get fixed right cell in first row
  const fixedCell = await row.$('.ant-table-cell-fix-right, .ant-table-cell-fix-right-first');
  
  // Function to get computed styles
  const getStyles = async (element) => {
    return await page.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background,
        backgroundColor: styles.backgroundColor,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        position: styles.position,
        className: el.className
      };
    }, element);
  };
  
  console.log('--- NORMAL STATE ---');
  console.log('Fixed Cell:', await getStyles(fixedCell));
  
  // Hover over the row
  await row.hover();
  
  console.log('--- HOVER STATE ---');
  console.log('Fixed Cell:', await getStyles(fixedCell));
  
  await browser.close();
})();
