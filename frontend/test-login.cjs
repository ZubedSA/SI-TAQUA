const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));
    
    console.log('Navigating to login...');
    await page.goto('http://localhost:5174/login');
    
    console.log('Filling form...');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123'); // guessing a pass, or just testing connection
    
    console.log('Submitting...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(4000);
    console.log('CURRENT URL:', page.url());
    
    await browser.close();
})();
