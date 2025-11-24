import { Page } from 'playwright';
import { browserManager } from './browser';
import axios from 'axios';
import OpenAI from 'openai';

export interface SubLocation {
    name: string;
    type: string; // 'neighborhood', 'district', 'zone', etc.
}

export class HierarchyScraper {
    private page: Page | null = null;
    private readonly TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    private readonly EXA_API_KEY = process.env.EXA_API_KEY;
    private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    private openai: OpenAI | null = null;

    constructor() {
        if (this.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: this.OPENAI_API_KEY });
        }
    }

    async init() {
        this.page = await browserManager.newPage();
    }

    /**
     * Discover sub-locations using OpenAI (Best), Tavily (Good), or Google (Fallback)
     */
    async getSubLocations(location: string): Promise<SubLocation[]> {
        console.log(`Discovering sub-locations for ${location}...`);
        const subLocations: SubLocation[] = [];
        const uniqueNames = new Set<string>();

        // Always include the main location
        subLocations.push({ name: location, type: 'primary' });
        uniqueNames.add(location.toLowerCase());

        // 1. Try OpenAI (GPT-4o) first - Superior quality
        if (this.openai) {
            try {
                console.log('Querying OpenAI (GPT-4o) for sub-locations...');
                const aiResults = await this.searchWithOpenAI(location);

                for (const loc of aiResults) {
                    const cleaned = this.cleanLocationName(loc.name);
                    if (this.isValidSubLocation(cleaned) && !uniqueNames.has(cleaned.toLowerCase())) {
                        subLocations.push({ name: cleaned, type: loc.type });
                        uniqueNames.add(cleaned.toLowerCase());
                    }
                }

                if (subLocations.length > 5) {
                    console.log(`OpenAI returned ${subLocations.length} locations. Skipping other methods.`);
                    return subLocations;
                }
            } catch (error) {
                console.error('OpenAI discovery failed:', error);
            }
        }

        // 2. Try Tavily (AI Search) second
        if (this.TAVILY_API_KEY) {
            try {
                console.log('Querying Tavily for sub-locations...');
                const tavilyResults = await this.searchWithTavily(location);

                for (const loc of tavilyResults) {
                    const cleaned = this.cleanLocationName(loc.name);
                    if (this.isValidSubLocation(cleaned) && !uniqueNames.has(cleaned.toLowerCase())) {
                        subLocations.push({ name: cleaned, type: loc.type });
                        uniqueNames.add(cleaned.toLowerCase());
                    }
                }
            } catch (error) {
                console.error('Tavily discovery failed:', error);
            }
        }

        // 3. Fallback to Google Search scraping
        if (subLocations.length < 5) {
            try {
                console.log('Falling back to Google Search scraping...');
                const googleResults = await this.scrapeGoogle(location);

                for (const loc of googleResults) {
                    const cleaned = this.cleanLocationName(loc.name);
                    if (this.isValidSubLocation(cleaned) && !uniqueNames.has(cleaned.toLowerCase())) {
                        subLocations.push({ name: cleaned, type: loc.type });
                        uniqueNames.add(cleaned.toLowerCase());
                    }
                }
            } catch (error) {
                console.error('Google scraping failed:', error);
            }
        }

        console.log(`Final list: ${subLocations.length} sub-locations`);
        return subLocations;
    }

    private async searchWithOpenAI(location: string): Promise<SubLocation[]> {
        if (!this.openai) return [];

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are a geographic expert. Return a JSON array of objects with 'name' and 'type' properties for all neighborhoods, districts, and suburbs in the specified location. 'type' should be 'neighborhood', 'district', 'suburb', etc. Return ONLY the JSON array, no markdown formatting."
                    },
                    {
                        role: "user",
                        content: `List all neighborhoods and districts in ${location}.`
                    }
                ],
                temperature: 0.3,
            });

            const content = completion.choices[0].message.content;
            if (!content) return [];

            // Clean markdown code blocks if present
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson) as SubLocation[];
        } catch (e) {
            console.error('OpenAI API error:', e);
            return [];
        }
    }

    private async searchWithTavily(location: string): Promise<SubLocation[]> {
        try {
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: this.TAVILY_API_KEY,
                query: `List of all neighborhoods, districts, and suburbs in ${location}. Return only the names.`,
                search_depth: "advanced",
                max_results: 10
            });

            const results: SubLocation[] = [];

            for (const result of response.data.results) {
                const content = result.content;
                const parts = content.split(/[,•\n]| and /);

                for (const part of parts) {
                    const cleaned = part.trim();
                    if (cleaned.length > 0 && cleaned.length < 40 && /^[A-Z]/.test(cleaned)) {
                        results.push({ name: cleaned, type: 'neighborhood' });
                    }
                }
            }
            return results;
        } catch (e) {
            console.error('Tavily API error:', e);
            return [];
        }
    }

    private async scrapeGoogle(location: string): Promise<SubLocation[]> {
        if (!this.page) await this.init();
        const page = this.page!;

        try {
            await page.goto(`https://www.google.com/search?q=neighborhoods+in+${encodeURIComponent(location)}`, {
                waitUntil: 'domcontentloaded'
            });

            try {
                await page.waitForSelector('div[role="heading"]', { timeout: 3000 });
            } catch (e) { }

            const elements = await page.$$eval('div[role="heading"][aria-level="3"], .w8qArf', els =>
                els.map(e => (e as HTMLElement).innerText)
            );

            return elements.map(text => ({ name: text, type: 'neighborhood' }));

        } catch (e) {
            return [];
        }
    }

    private async searchWithExa(location: string): Promise<SubLocation[]> {
        // Kept for future use if needed, but currently not primary
        return [];
    }

    private cleanLocationName(name: string): string {
        // Remove special characters and extra spaces
        let cleaned = name
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Remove common junk prefixes/suffixes
        const junkTerms = [
            'results for', 'showing results for', 'search results',
            'people also ask', 'related searches', 'images for',
            'videos for', 'news for', 'maps for', 'neighborhoods in'
        ];

        for (const term of junkTerms) {
            if (cleaned.toLowerCase().startsWith(term)) {
                cleaned = cleaned.substring(term.length).trim();
            }
        }

        return cleaned;
    }

    private isValidSubLocation(name: string): boolean {
        const lower = name.toLowerCase();
        const invalidTerms = [
            'results', 'search', 'find', 'view', 'more', 'all',
            'map', 'directions', 'website', 'address', 'phone',
            'hours', 'reviews', 'photos', 'about', 'menu',
            'related', 'people', 'ask', 'questions', 'images',
            'videos', 'news', 'shopping', 'books', 'flights',
            'finance', 'personal', 'tools', 'settings', 'privacy',
            'terms', 'advertising', 'business', 'solutions',
            'federal', 'republic', 'president', 'population',
            'area', 'council', 'government', 'state', 'capital',
            'territory', 'zone', 'region', 'district', 'neighborhood'
        ];

        // Rule 1: Length constraints
        if (name.length < 3 || name.length > 35) return false;

        // Rule 2: Word count (reject sentences)
        const wordCount = name.split(' ').length;
        if (wordCount > 4) return false;

        // Rule 3: Invalid terms
        if (invalidTerms.some(term => lower === term)) return false;
        if (invalidTerms.some(term => lower.startsWith(term + ' '))) return false;

        // Rule 4: Special characters indicating junk
        if (name.includes('...') || name.includes('|') || name.includes(':')) return false;

        // Rule 5: Must contain letters
        if (!/[a-zA-Z]/.test(name)) return false;

        return true;
    }

    async close() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
    }
}

export const hierarchyScraper = new HierarchyScraper();
