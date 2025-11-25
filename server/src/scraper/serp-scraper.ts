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
     * Search Google Maps using Serper.dev API with pagination
     * Uses `start` parameter for pagination and `num` for results per page
     * @param query The search query (e.g., "Real Estate around Wuse")
     * @param maxResults Maximum total results to fetch (will paginate to reach this)
     * @returns Array of business results
     */
    async searchGoogleMaps(query: string, maxResults: number = 200): Promise<BusinessResult[]> {
        if (!this.apiKey) {
            throw new Error('SERPAPI_KEY is not configured');
        }

        try {
            console.log(`[Serper] Searching for: ${query} (target: ${maxResults} results)`);

            const allResults: BusinessResult[] = [];
            const resultsPerPage = 100; // Max allowed by Serper
            let locationCoords: string | null = null;
            let currentOffset = 0;

            // Calculate how many pages we need
            const totalPages = Math.ceil(maxResults / resultsPerPage);

            for (let page = 1; page <= totalPages; page++) {
                try {
                    const requestBody: any = {
                        q: query,
                        num: resultsPerPage,  // Request 100 results per page
                        start: currentOffset   // Offset for pagination
                    };

                    // For offset > 0, we MUST include GPS coordinates
                    if (currentOffset > 0 && locationCoords) {
                        requestBody.ll = locationCoords;
                    }

                    console.log(`[Serper] Page ${page}: Requesting ${resultsPerPage} results (offset: ${currentOffset})`);

                    const response = await fetch(this.baseUrl, {
                        method: 'POST',
                        headers: {
                            'X-API-KEY': this.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[Serper] Page ${page} error: ${response.status} - ${errorText}`);
                        break;
                    }

                    const data = await response.json();

                    // Check for API errors
                    if (data.error) {
                        console.error(`[Serper] Page ${page} error: ${data.error}`);
                        break;
                    }

                    // On first page, extract location coordinates for subsequent requests
                    if (page === 1 && data.searchParameters) {
                        if (data.searchParameters.ll) {
                            locationCoords = data.searchParameters.ll;
                        } else if (data.places && data.places.length > 0 && data.places[0].position) {
                            const firstResult = data.places[0].position;
                            locationCoords = `@${firstResult.lat},${firstResult.lng},14z`;
                        }
                        console.log(`[Serper] Extracted coordinates: ${locationCoords}`);
                    }

                    // Parse results
                    const pageResults = this.parseResults(data);

                    if (pageResults.length === 0) {
                        console.log(`[Serper] No more results on page ${page}`);
                        break;
                    }

                    allResults.push(...pageResults);
                    console.log(`[Serper] Page ${page}: Got ${pageResults.length} businesses (total: ${allResults.length})`);

                    // If we've reached our target, stop
                    if (allResults.length >= maxResults) {
                        console.log(`[Serper] Reached target of ${maxResults} results`);
                        break;
                    }

                    // Move to next page (Serper recommends incrementing by 20, but we use 100)
                    currentOffset += resultsPerPage;

                    // Small delay to avoid rate limiting
                    if (page < totalPages) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }

                } catch (pageError: any) {
                    console.error(`[Serper] Error on page ${page}:`, pageError.message);
                    break;
                }
            }

            console.log(`[Serper] Completed: ${allResults.length} total businesses`);
            return allResults.slice(0, maxResults); // Trim to requested max

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
