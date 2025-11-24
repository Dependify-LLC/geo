import 'dotenv/config';
import { chromium } from 'playwright';

async function testBrowserless() {
    const browserlessUrl = process.env.BROWSERLESS_URL;

    console.log('Testing Browserless connection...');
    console.log('URL:', browserlessUrl);

    if (!browserlessUrl) {
        console.error('❌ BROWSERLESS_URL is not set in .env');
        process.exit(1);
    }

    try {
        console.log('Attempting to connect using CDP...');
        const browser = await chromium.connectOverCDP(browserlessUrl, {
            timeout: 30000,
        });

        console.log('✅ Successfully connected to Browserless!');

        // Try to create a page and navigate
        const context = browser.contexts()[0] || await browser.newContext({
            viewport: { width: 1280, height: 800 },
        });

        const page = await context.newPage();
        console.log('✅ Page created successfully');

        console.log('Testing navigation to Google...');
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('✅ Successfully navigated to Google!');

        const title = await page.title();
        console.log('Page title:', title);

        await browser.close();
        console.log('✅ Test completed successfully!');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

testBrowserless();
