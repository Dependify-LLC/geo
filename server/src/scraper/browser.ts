import { chromium, Browser, Page, BrowserContext } from 'playwright';

// Note: We are using Playwright directly here, but for stealth we might need to use 
// puppeteer-extra with playwright-extra if strict stealth is needed. 
// For now, we'll use standard Playwright with some custom args which is often sufficient 
// for basic scraping, or we can switch to puppeteer-extra if we face blocks.
// Given the requirements mentioned puppeteer-extra-plugin-stealth, we can try to use 
// playwright-extra if available or stick to puppeteer if playwright proves difficult for stealth.
// However, the plan mentioned Playwright. Let's stick to Playwright with custom args first.

export class BrowserManager {
    private browser: Browser | null = null;

    async init() {
        if (this.browser) {
            if (this.browser.isConnected()) return;
            this.browser = null;
        }

        // Priority 1: Use local Browserless if available
        const localBrowserlessUrl = process.env.BROWSERLESS_URL; // e.g., ws://localhost:3000

        if (localBrowserlessUrl) {
            console.log(`Connecting to local Browserless at ${localBrowserlessUrl}...`);
            try {
                this.browser = await chromium.connectOverCDP(localBrowserlessUrl, {
                    timeout: 60000,
                });
                console.log('✅ Connected to local Browserless successfully');
                return;
            } catch (error) {
                console.error('Failed to connect to local Browserless:', error);
                console.log('Trying cloud Browserless...');
            }
        }

        // Priority 2: Use Browserless.io cloud if local fails
        const browserlessToken = process.env.BROWSERLESS_TOKEN || '2TU82jV0f5xo1JQd6c1b0bb12f93e6f7f72dba87afac14764';
        const browserlessEndpoint = `wss://production-sfo.browserless.io?token=${browserlessToken}`;

        if (browserlessToken && !localBrowserlessUrl) {
            console.log(`Connecting to Browserless.io cloud...`);
            try {
                this.browser = await chromium.connectOverCDP(browserlessEndpoint, {
                    timeout: 60000,
                });
                console.log('✅ Connected to Browserless.io successfully');
                return;
            } catch (error) {
                console.error('Failed to connect to Browserless.io:', error);
                console.log('Falling back to local browser...');
            }
        }

        // Fallback to local browser if not using Browserless or connection failed
        if (!this.browser) {
            console.log('Launching local Chromium browser...');
            this.browser = await chromium.launch({
                headless: true, // Must be headless in production/Docker
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certifcate-errors',
                    '--ignore-certifcate-errors-spki-list',
                    '--disable-blink-features=AutomationControlled',
                    '--exclude-switches=enable-automation',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
        }
    }

    async newPage(): Promise<Page> {
        if (!this.browser || !this.browser.isConnected()) await this.init();

        // Create a new context for every page to ensure isolation and stability
        const context = await this.browser!.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'en-US',
            timezoneId: 'America/New_York',
            permissions: ['geolocation'],
            ignoreHTTPSErrors: true,
        });

        // Manual stealth scripts removed to avoid conflicts with Browserless stealth mode

        return context.newPage();
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export const browserManager = new BrowserManager();
