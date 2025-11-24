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

            const allResults: BusinessResult[] = [];
            const resultsPerPage = 20; // Serper.dev returns 20 results per page
            const maxPages = 10; // Fetch 10 pages to get ~200 results

            // Make multiple requests to get all results
            for (let page = 1; page <= maxPages; page++) {
                try {
                    const response = await fetch(this.baseUrl, {
                        method: 'POST',
                        headers: {
                            'X-API-KEY': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            q: query,
                            page: page
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[Serper] Page ${page} error: ${response.status} - ${errorText}`);
                        break; // Stop pagination on error
                    }

                    const data = await response.json();

                    // Check for API errors
                    if (data.error) {
                        console.error(`[Serper] Page ${page} error: ${data.error}`);
                        break;
                    }

                    // Parse the results from this page
                    const pageResults = this.parseResults(data);

                    if (pageResults.length === 0) {
                        console.log(`[Serper] No more results on page ${page}, stopping pagination`);
                        break; // No more results available
                    }

                    allResults.push(...pageResults);
                    console.log(`[Serper] Page ${page}: Found ${pageResults.length} businesses (total: ${allResults.length})`);

                    // Small delay between requests to avoid rate limiting
                    if (page < maxPages) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                } catch (pageError: any) {
                    console.error(`[Serper] Error on page ${page}:`, pageError.message);
                    break; // Stop on error
                }
            }

            console.log(`[Serper] Found ${allResults.length} total businesses`);
            return allResults;

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
