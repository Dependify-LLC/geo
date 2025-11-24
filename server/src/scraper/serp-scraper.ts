import { BusinessResult } from './maps';

export class SerpScraper {
    private apiKey: string;
    private baseUrl = 'https://google.serper.dev/maps';

    constructor() {
        this.apiKey = process.env.SERPAPI_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️  SERPAPI_KEY not set. Serper scraping will be disabled.');
        }
    }

    /**
     * Search Google Maps using Serper.dev API
     * @param query The search query (e.g., "Real Estate around Wuse")
     * @returns Array of business results
     */
    async searchGoogleMaps(query: string): Promise<BusinessResult[]> {
        if (!this.apiKey) {
            throw new Error('SERPAPI_KEY is not configured');
        }

        try {
            console.log(`[Serper] Searching for: ${query}`);

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'X-API-KEY': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: query
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Serper error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Check for API errors
            if (data.error) {
                throw new Error(`Serper error: ${data.error}`);
            }

            // Parse the results
            const results = this.parseResults(data);
            console.log(`[Serper] Found ${results.length} businesses`);

            return results;

        } catch (error: any) {
            console.error('[Serper] Error:', error.message);
            throw error;
        }
    }

    /**
     * Parse Serper.dev response into our BusinessResult format
     */
    private parseResults(data: any): BusinessResult[] {
        const results: BusinessResult[] = [];

        // Serper.dev returns data in 'places' array
        const places = data.places || [];

        for (const item of places) {
            const result: BusinessResult = {
                name: item.title || '',
                address: item.address || undefined,
                rating: item.rating ? String(item.rating) : undefined,
                reviewsCount: item.reviews || item.reviewsCount || undefined,
                category: item.type || item.category || undefined,
                phone: item.phoneNumber || item.phone || undefined,
                website: item.website || undefined,
                placeId: item.placeId || item.cid || undefined,
                coordinates: (item.position || item.gps_coordinates) ? {
                    lat: item.position?.lat || item.gps_coordinates?.latitude,
                    lng: item.position?.lng || item.gps_coordinates?.longitude
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
     * Check if Serper API is available (API key is set)
     */
    isAvailable(): boolean {
        return !!this.apiKey;
    }
}

export const serpScraper = new SerpScraper();
