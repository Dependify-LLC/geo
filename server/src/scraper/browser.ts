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

        const browserlessUrl = process.env.BROWSERLESS_URL;

        if (browserlessUrl) {
            // Connect to Browserless instance using CDP
            // Append stealth flag if not present
            const separator = browserlessUrl.includes('?') ? '&' : '?';
            const finalUrl = `${browserlessUrl}${separator}stealth`;

            console.log(`Connecting to Browserless at ${finalUrl}...`);
            try {
                this.browser = await chromium.connectOverCDP(finalUrl, {
                    timeout: 60000, // Increased timeout for stability
                });
                console.log('✅ Connected to Browserless successfully');
            } catch (error) {
                console.error('Failed to connect to Browserless:', error);
                console.log('Falling back to local browser...');
                // Fall through to local browser launch
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
