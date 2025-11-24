import { Page } from 'playwright';
import { browserManager } from './browser';

export interface BusinessResult {
    name: string;
    address?: string;
    rating?: string;
    reviewsCount?: number;
    category?: string;
    phone?: string;
    website?: string;
    placeId?: string;
    coordinates?: { lat: number; lng: number };
}

export class MapsScraper {
    private page: Page | null = null;
    private readonly RETRY_ATTEMPTS = 3;
    private readonly REQUEST_DELAY = 2000; // 2 seconds between requests

    async init() {
        this.page = await browserManager.newPage();
    }

    private async delay(ms: number) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkForCaptcha(): Promise<boolean> {
        if (!this.page) return false;
        try {
            // Check for common Google CAPTCHA indicators
            const isCaptcha = await this.page.evaluate(() => {
                const bodyText = document.body.innerText;
                return bodyText.includes('Our systems have detected unusual traffic') ||
                    !!document.querySelector('form#captcha-form') ||
                    !!document.querySelector('iframe[src*="recaptcha"]');
            });

            if (isCaptcha) {
                console.log('\n⚠️  CAPTCHA DETECTED! ⚠️');
                console.log('The script has paused. Please solve the CAPTCHA in the browser window manually.');
                console.log('Waiting for you to solve it...');

                // Wait indefinitely until the CAPTCHA indicators are gone
                await this.page.waitForFunction(() => {
                    const bodyText = document.body.innerText;
                    return !bodyText.includes('Our systems have detected unusual traffic') &&
                        !document.querySelector('form#captcha-form');
                }, { timeout: 0, polling: 2000 });

                console.log('✅ CAPTCHA solved. Resuming execution in 3 seconds...\n');
                await this.delay(3000);
                return true;
            }
            return false;
        } catch (error) {
            console.log('Error checking for CAPTCHA:', error);
            return false;
        }
    }

    async searchLocation(location: string, retries = this.RETRY_ATTEMPTS): Promise<void> {
        if (!this.page) await this.init();

        try {
            console.log(`[DEBUG] Navigating to Google Maps for ${location}...`);
            await this.page!.goto(`https://www.google.com/maps/search/${encodeURIComponent(location)}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            console.log(`[DEBUG] Navigation complete. URL: ${this.page!.url()}`);

            await this.checkForCaptcha();

            // Wait for initial load - try multiple possible selectors
            console.log('[DEBUG] Waiting for feed or main selector...');
            await Promise.race([
                this.page!.waitForSelector('div[role="feed"]', { timeout: 10000 }),
                this.page!.waitForSelector('div[role="main"]', { timeout: 10000 })
            ]).then(() => {
                console.log('[DEBUG] Initial selector found.');
            }).catch((e) => {
                console.log('[DEBUG] Feed not found immediately, might be a direct place result or different layout. Error:', e.message);
            });

            await this.checkForCaptcha();
            await this.delay(this.REQUEST_DELAY);
        } catch (error: any) {
            // 1. Check for critical "Target closed" errors first
            if (error.message && (error.message.includes('Target page, context or browser has been closed') || error.message.includes('Session closed'))) {
                console.log('[DEBUG] Browser context crashed or closed. Forcing restart...');
                await this.close(); // Close current page/context
                this.page = null; // Force re-init

                if (retries > 0) {
                    console.log(`Retrying with fresh context... (${retries} attempts remaining)`);
                    await this.delay(2000);
                    return this.searchLocation(location, retries - 1);
                }
            }

            // 2. Handle standard navigation errors
            console.error(`Error navigating to location (attempt ${this.RETRY_ATTEMPTS - retries + 1}):`, error);

            // Check if error was caused by CAPTCHA
            const wasCaptcha = await this.checkForCaptcha();

            if (wasCaptcha) {
                // CAPTCHA was solved, retry without decrementing retry count
                console.log('CAPTCHA solved, retrying navigation...');
                await this.delay(2000);
                return this.searchLocation(location, retries); // Don't decrement retries
            }

            if (retries > 0) {
                console.log(`Retrying... (${retries} attempts remaining)`);
                await this.delay(3000);
                return this.searchLocation(location, retries - 1);
            }
            throw new Error(`Failed to navigate to location after ${this.RETRY_ATTEMPTS} attempts`);
        }
    }

    async searchKeywordsInArea(keyword: string, retries = this.RETRY_ATTEMPTS): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');

        try {
            // Clear search box and type keyword
            await this.page!.click('#searchboxinput');
            await this.page!.fill('#searchboxinput', '');
            await this.delay(500);
            await this.page!.fill('#searchboxinput', keyword);
            await this.page!.keyboard.press('Enter');

            console.log(`Searching for ${keyword}...`);

            // Wait for results to load
            console.log('[DEBUG] Waiting for search results selector...');
            await this.page!.waitForSelector('div[role="feed"]', { timeout: 15000 });
            console.log('[DEBUG] Search results selector found.');

            await this.checkForCaptcha();
            await this.delay(this.REQUEST_DELAY);
        } catch (error) {
            console.error(`Error searching for keyword (attempt ${this.RETRY_ATTEMPTS - retries + 1}):`, error);

            // Check if error was caused by CAPTCHA
            const wasCaptcha = await this.checkForCaptcha();

            if (wasCaptcha) {
                // CAPTCHA was solved, retry without decrementing retry count
                console.log('CAPTCHA solved, retrying keyword search...');
                await this.delay(2000);
                return this.searchKeywordsInArea(keyword, retries); // Don't decrement retries
            }

            if (retries > 0) {
                console.log(`Retrying... (${retries} attempts remaining)`);
                await this.delay(3000);
                return this.searchKeywordsInArea(keyword, retries - 1);
            }
            throw new Error(`Failed to search for keyword after ${this.RETRY_ATTEMPTS} attempts`);
        }
    }

    async scrollAndExtract(onResult?: (result: BusinessResult) => Promise<void>): Promise<BusinessResult[]> {
        if (!this.page) throw new Error('Page not initialized');

        const results: BusinessResult[] = [];
        const feedSelector = 'div[role="feed"]';

        try {
            console.log('Starting aggressive scrolling to load ALL results...');

            // Aggressive scrolling to load all results (not just 20)
            let previousHeight = 0;
            let noChangeCount = 0;
            const maxNoChangeAttempts = 5; // Stop after 5 scrolls with no new content

            while (noChangeCount < maxNoChangeAttempts) {
                // Scroll to bottom using human-like behavior
                const currentHeight = await this.page!.evaluate(async (selector) => {
                    const element = document.querySelector(selector);
                    if (!element) return 0;

                    const distance = 300 + Math.floor(Math.random() * 200); // Random scroll distance
                    const delay = 100 + Math.floor(Math.random() * 300); // Random delay

                    // Smooth scroll
                    element.scrollBy({ top: distance, behavior: 'smooth' });
                    await new Promise(r => setTimeout(r, delay));

                    // Occasionally scroll back up a bit (human-like)
                    if (Math.random() < 0.2) {
                        element.scrollBy({ top: -100, behavior: 'smooth' });
                    }

                    // Ensure we reach bottom eventually
                    if (element.scrollHeight - element.scrollTop < 1000) {
                        element.scrollTop = element.scrollHeight;
                    }

                    return element.scrollHeight;
                }, feedSelector);

                // Wait for content to load with random delay
                await this.delay(2000 + Math.random() * 1000);

                // Check for CAPTCHA periodically
                await this.checkForCaptcha();

                // Check if we loaded new content
                // We need to check if the scrollHeight actually increased significantly or if we are just scrolling
                // For now, let's trust the height check.
                // Re-evaluate height after wait
                const newHeight = await this.page!.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.scrollHeight : 0;
                }, feedSelector);

                if (newHeight === previousHeight) {
                    noChangeCount++;
                    console.log(`No new content loaded (attempt ${noChangeCount}/${maxNoChangeAttempts})`);
                } else {
                    noChangeCount = 0; // Reset counter
                    console.log(`Loaded new content, scrollHeight: ${newHeight}`);
                }

                previousHeight = newHeight;
            }

            console.log('Finished scrolling, now extracting all items...');

            // Get all items (no limit!)
            const itemSelector = 'div[role="article"] > a, a[href*="/maps/place/"]';
            const items = await this.page!.$$(itemSelector);
            console.log(`[DEBUG] Found ${items.length} total items to process`);

            // Extract ALL items
            for (let i = 0; i < items.length; i++) {
                try {
                    const item = items[i];

                    // Try to get name from the list item first (more reliable)
                    const listName = await item.getAttribute('aria-label') || await item.evaluate(el => el.textContent || '');
                    console.log(`[${i + 1}/${items.length}] Inspecting item: "${listName}"`);

                    // Skip sponsored items immediately
                    if (listName?.includes('Sponsored') || listName?.includes('Ad') || listName?.includes('...')) {
                        console.log('Skipping sponsored/ad item');
                        continue;
                    }

                    // Click the item to load details in the side panel
                    await item.click();
                    await this.delay(2500); // Wait for details to load

                    // Extract details from the main view
                    const details = await this.page!.evaluate(() => {
                        // Find the correct H1 - ignore "Results" or empty ones
                        const h1s = Array.from(document.querySelectorAll('h1'));
                        const businessH1 = h1s.find(h => {
                            const text = (h as HTMLElement).innerText?.trim();
                            return text && text !== 'Results' && text !== 'Geomaster' && text !== 'Sponsored';
                        });
                        const name = businessH1 ? (businessH1 as HTMLElement).innerText : '';

                        const addressBtn = document.querySelector('button[data-item-id="address"]');
                        const address = addressBtn ? addressBtn.getAttribute('aria-label') : '';

                        const websiteBtn = document.querySelector('a[data-item-id="authority"]');
                        const website = websiteBtn ? websiteBtn.getAttribute('href') : '';

                        const phoneBtn = document.querySelector('button[data-item-id^="phone"]');
                        const phone = phoneBtn ? phoneBtn.getAttribute('aria-label') : '';

                        // Try to get rating
                        const ratingElement = document.querySelector('div[role="img"][aria-label*="star"]');
                        const rating = ratingElement ? ratingElement.getAttribute('aria-label') : '';

                        // Extract Place ID from URL
                        const url = window.location.href;
                        const placeIdMatch = url.match(/\/place\/([^\/]+)\//) || url.match(/data=![34]m\d+!1s([^!]+)/);
                        const placeId = placeIdMatch ? placeIdMatch[1] : '';

                        return { name, address, website, phone, rating, placeId };
                    });

                    // Use list name if detail name is missing or suspicious
                    const finalName = (details.name && details.name.length > 2) ? details.name : listName;

                    if (finalName) {
                        const result = {
                            name: finalName,
                            address: details.address?.replace('Address: ', ''),
                            website: details.website || undefined,
                            phone: details.phone?.replace('Phone: ', ''),
                            rating: details.rating || undefined,
                            placeId: details.placeId || undefined,
                        };

                        results.push(result);
                        console.log(`✓ Extracted: ${finalName} (ID: ${details.placeId})`);

                        // Stream result if callback provided
                        if (onResult) {
                            await onResult(result);
                        }
                    }

                    // Rate limiting between items
                    await this.delay(1000);
                } catch (e) {
                    console.error(`Error extracting item ${i}:`, e);
                    // Continue with next item even if this one fails
                }
            }

            console.log(`Successfully extracted ${results.length} businesses (no limit applied)`);
        } catch (error) {
            console.error('Error during scroll and extract:', error);
            // Return whatever we managed to extract
        }

        return results;
    }

    async close() {
        if (this.page) {
            try {
                // Close the context (which closes the page) to clean up
                const context = this.page.context();
                await context.close();
                console.log('[DEBUG] Browser context closed.');
            } catch (error) {
                console.error('Error closing page/context:', error);
            }
            this.page = null;
        }
    }
}

export const mapsScraper = new MapsScraper();
