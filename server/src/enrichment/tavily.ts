import axios from 'axios';

export class TavilyClient {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY || '';
    }

    async search(query: string) {
        if (!this.apiKey) {
            console.warn('Tavily API key not found. Returning empty results.');
            return { results: [] };
        }

        try {
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: this.apiKey,
                query,
                search_depth: 'basic',
                include_domains: [],
                exclude_domains: []
            });
            return response.data;
        } catch (error) {
            console.error('Tavily search failed:', error);
            return { results: [] };
        }
    }

    async getNeighborhoods(city: string): Promise<string[]> {
        // Heuristic: Search for "neighborhoods in [City]" and try to extract list
        // This is a simplified approach. In production, we might use a better geo-database.
        const response = await this.search(`list of neighborhoods in ${city}`);

        // This is a placeholder. Real extraction from search results is complex.
        // For now, we might just return the city itself if we can't find sub-locations,
        // or try to parse the snippet.

        // Mock return for MVP if no key or parsing fails
        return [city];
    }
}

export const tavilyClient = new TavilyClient();
