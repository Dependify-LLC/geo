import { BusinessResult } from './maps';

export class SerpScraper {
    private apiKey: string;
    private baseUrl = 'https://serpapi.com/search.json';

    constructor() {
        this.apiKey = process.env.SERPAPI_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️  SERPAPI_KEY not set. SerpApi scraping will be disabled.');
        }
    }

    /**
     * Search Google Maps using SerpApi
     * @param query The search query (e.g., "Real Estate around Wuse")
     * @returns Array of business results
     */
    async searchGoogleMaps(query: string): Promise<BusinessResult[]> {
        if (!this.apiKey) {
            throw new Error('SERPAPI_KEY is not configured');
        }

        try {
            console.log(`[SerpApi] Searching for: ${query}`);

            const url = new URL(this.baseUrl);
            url.searchParams.append('engine', 'google_maps');
            url.searchParams.append('q', query);
            url.searchParams.append('api_key', this.apiKey);
            url.searchParams.append('type', 'search');
            url.searchParams.append('num', '100'); // Request up to 100 results

            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`SerpApi error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Check for API errors
            if (data.error) {
                throw new Error(`SerpApi error: ${data.error}`);
            }

            // Parse the results
            const results = this.parseResults(data);
            console.log(`[SerpApi] Found ${results.length} businesses`);

            return results;

        } catch (error: any) {
            console.error('[SerpApi] Error:', error.message);
            throw error;
        }
    }

    /**
     * Parse SerpApi response into our BusinessResult format
     */
    private parseResults(data: any): BusinessResult[] {
        const results: BusinessResult[] = [];

        // SerpApi returns data in 'local_results' array
        const localResults = data.local_results || [];

        for (const item of localResults) {
            const result: BusinessResult = {
                name: item.title || '',
                address: item.address || undefined,
                rating: item.rating ? String(item.rating) : undefined,
                reviewsCount: item.reviews || undefined,
                category: item.type || undefined,
                phone: item.phone || undefined,
                website: item.website || undefined,
                placeId: item.place_id || item.data_id || undefined,
                coordinates: item.gps_coordinates ? {
                    lat: item.gps_coordinates.latitude,
                    lng: item.gps_coordinates.longitude
                } : undefined
            };

            // Only add if we have at least a name
            if (result.name) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Check if SerpApi is available (API key is set)
     */
    isAvailable(): boolean {
        return !!this.apiKey;
    }
}

export const serpScraper = new SerpScraper();
