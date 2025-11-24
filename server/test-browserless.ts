// Browserless Integration Test
// This script tests the Browserless connection by attempting to connect and create a page.
// Run with: npx tsx test-browserless.ts

import { chromium } from 'playwright';

async function testBrowserless() {
    const browserlessUrl = process.env.BROWSERLESS_URL;

    if (!browserlessUrl) {
        console.log('❌ BROWSERLESS_URL not set. Set it in .env file.');
        console.log('Example: BROWSERLESS_URL=ws://localhost:3001');
        process.exit(1);
    }

    console.log(`Testing connection to Browserless at ${browserlessUrl}...`);

    try {
        // Connect to Browserless
        const browser = await chromium.connect(browserlessUrl, {
            timeout: 30000,
        });
        console.log('✅ Connected to Browserless successfully');

        // Create a page
        const page = await browser.newPage();
        console.log('✅ Created new page');

        // Navigate to a test page
        await page.goto('https://example.com', { waitUntil: 'networkidle' });
        console.log('✅ Navigated to example.com');

        // Get page title
        const title = await page.title();
        console.log(`✅ Page title: "${title}"`);

        // Close browser
        await browser.close();
        console.log('✅ Browser closed successfully');

        console.log('\n🎉 Browserless connection test PASSED!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Browserless connection test FAILED:');
        console.error(error);
        process.exit(1);
    }
}

testBrowserless();
