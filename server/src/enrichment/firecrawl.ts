import axios from 'axios';

export class FirecrawlClient {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    }

    async scrapeUrl(url: string) {
        if (!this.apiKey) {
            console.warn('Firecrawl API key not found. Returning empty results.');
            return null;
        }

        try {
            // Note: Firecrawl API might be async (submit job -> poll), but for MVP we assume sync or simplified endpoint if available,
            // or we just use the scrape endpoint.
            const response = await axios.post('https://api.firecrawl.dev/v0/scrape', {
                url,
                pageOptions: {
                    onlyMainContent: true
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Firecrawl scrape failed:', error);
            return null;
        }
    }
}

export const firecrawlClient = new FirecrawlClient();
