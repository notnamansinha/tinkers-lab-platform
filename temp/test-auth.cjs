const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173/login');
  
  console.log('Waiting for button...');
  await page.waitForSelector('button');
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('CONTINUE WITH GOOGLE') || text.includes('Google')) {
      console.log('Clicking Google Auth button...');
      await btn.click();
      break;
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
})();
