import { Router } from 'express';
import { db } from '../db';
import { searches, businesses, enrichmentData, sublocations, savedLocations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { MapsScraper } from '../scraper/maps';
import { hierarchyScraper } from '../scraper/hierarchy';
import { dataAggregator } from '../enrichment/aggregator';
import { authenticateToken, AuthRequest } from '../auth/middleware';

const router = Router();

// PHASE 1: Start a new search (discovery phase only)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const { location, keyword } = req.body;
    const userId = req.user!.id;

    if (!location || !keyword) {
        return res.status(400).json({ error: 'Location and keyword are required' });
    }

    try {
        // Check if location is already saved/cached
        const existingLocation = await db.select().from(savedLocations).where(eq(savedLocations.name, location)).limit(1);
        let savedLocationId = existingLocation.length > 0 ? existingLocation[0].id : null;

        // Create search record
        const [search] = await db.insert(searches).values({
            userId,
            location,
            keyword,
            status: 'discovering',
            phase: 'discovering',
            savedLocationId, // Link if exists
            createdAt: new Date(),
        }).returning();

        if (savedLocationId) {
            console.log(`Cache Hit: Location '${location}' found in saved_locations (ID: ${savedLocationId})`);

            // Reuse existing sublocations
            const cachedSublocations = await db.select().from(sublocations)
                .where(eq(sublocations.savedLocationId, savedLocationId));

            // Deduplicate by name just in case
            const uniqueSublocations = new Map();
            cachedSublocations.forEach(sl => uniqueSublocations.set(sl.name, sl));

            console.log(`Reusing ${uniqueSublocations.size} cached sub-locations...`);

            // Copy them to the new search
            for (const sl of uniqueSublocations.values()) {
                await db.insert(sublocations).values({
                    searchId: search.id,
                    savedLocationId,
                    name: sl.name,
                    type: sl.type,
                    status: 'pending',
                    businessCount: 0,
                    createdAt: new Date(),
                });
            }

            // Immediately mark as ready to scrape
            await db.update(searches).set({
                status: 'ready_to_scrape',
                phase: 'ready_to_scrape'
            }).where(eq(searches.id, search.id));

            res.json({ searchId: search.id, status: 'ready_to_scrape', phase: 'ready_to_scrape', cached: true });

        } else {
            console.log(`Cache Miss: Location '${location}' not found. Starting discovery...`);

            // Start sub-location discovery in background
            discoverSubLocations(search.id, location);

            res.json({ searchId: search.id, status: 'discovering', phase: 'discovering', cached: false });
        }

    } catch (error: any) {
        console.error('Search creation error:', error);
        const fs = require('fs');
        fs.writeFileSync('error.log', `Error: ${error.message}\nStack: ${error.stack}\n`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get search status and results
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const searchResult = await db.select().from(searches).where(eq(searches.id, Number(id)));
        const search = searchResult[0];

        if (!search) {
            return res.status(404).json({ error: 'Search not found' });
        }

        // Get sublocations
        const sublocationsList = await db.select().from(sublocations).where(eq(sublocations.searchId, Number(id)));

        // Get businesses
        const results = await db.select().from(businesses).where(eq(businesses.searchId, Number(id)));

        // Get enrichment data for these businesses
        const enrichedResults = await Promise.all(results.map(async (b) => {
            const enrichment = await db.select().from(enrichmentData).where(eq(enrichmentData.businessId, b.id));
            return { ...b, enrichment };
        }));

        res.json({
            search,
            sublocations: sublocationsList,
            results: enrichedResults
        });
    } catch (error) {
        console.error('Get search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sublocations for a search
router.get('/:id/sublocations', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const sublocationsList = await db.select().from(sublocations).where(eq(sublocations.searchId, Number(id)));
        res.json({ sublocations: sublocationsList });
    } catch (error) {
        console.error('Get sublocations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download sublocations as CSV
router.get('/:id/sublocations/download', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const sublocationsList = await db.select().from(sublocations).where(eq(sublocations.searchId, Number(id)));

        // Generate CSV
        const csv = [
            'Name,Type,Status,Business Count',
            ...sublocationsList.map(sl => `"${sl.name}","${sl.type}","${sl.status}",${sl.businessCount}`)
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sublocations-${id}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Download sublocations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PHASE 2: Start scraping phase (after user confirms)
router.post('/:id/scrape', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const searchResult = await db.select().from(searches).where(eq(searches.id, Number(id)));
        const search = searchResult[0];

        if (!search) {
            return res.status(404).json({ error: 'Search not found' });
        }

        if (search.phase !== 'ready_to_scrape') {
            return res.status(400).json({ error: 'Search is not ready for scraping' });
        }

        // Update status to scraping
        await db.update(searches).set({
            status: 'scraping',
            phase: 'scraping'
        }).where(eq(searches.id, Number(id)));

        // Start scraping in background
        processScraping(Number(id), search.location, search.keyword);

        res.json({ searchId: Number(id), status: 'scraping', phase: 'scraping' });
    } catch (error) {
        console.error('Start scraping error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Background job: Discover sub-locations using APIs
async function discoverSubLocations(searchId: number, location: string) {
    try {
        console.log(`Starting sub-location discovery for search ${searchId}...`);

        // Use APIs to discover sub-locations
        const discoveredLocations = await hierarchyScraper.getSubLocations(location);

        console.log(`Discovered ${discoveredLocations.length} sub-locations`);

        // Create or get SavedLocation
        let savedLocationId: number;
        let isNewLocation = false;
        const existingSaved = await db.select().from(savedLocations).where(eq(savedLocations.name, location)).limit(1);

        if (existingSaved.length > 0) {
            savedLocationId = existingSaved[0].id;
        } else {
            const [newSaved] = await db.insert(savedLocations).values({
                name: location,
                primarySearchId: searchId // Set this search as primary since it's the first
            }).returning();
            savedLocationId = newSaved.id;
            isNewLocation = true;
        }

        // Update search with savedLocationId
        await db.update(searches).set({ savedLocationId }).where(eq(searches.id, searchId));

        // Save sublocations to database
        for (const loc of discoveredLocations) {
            await db.insert(sublocations).values({
                searchId,
                savedLocationId, // Link to master hierarchy
                name: loc.name,
                type: loc.type,
                status: 'pending',
                businessCount: 0,
                createdAt: new Date(),
            });
        }

        // Update search status to ready_to_scrape
        await db.update(searches).set({
            status: 'ready_to_scrape',
            phase: 'ready_to_scrape'
        }).where(eq(searches.id, searchId));

        console.log(`Sub-location discovery completed for search ${searchId}`);
    } catch (error) {
        console.error(`Error in sub-location discovery for search ${searchId}:`, error);
        await db.update(searches).set({ status: 'failed' }).where(eq(searches.id, searchId));
    }
}

// Background job: Systematic scraping of all sublocations
async function processScraping(searchId: number, location: string, keyword: string) {
    const mapsScraper = new MapsScraper();

    try {
        await mapsScraper.init();

        // Get all sublocations for this search
        const sublocationsList = await db.select().from(sublocations).where(eq(sublocations.searchId, searchId));

        console.log(`Starting systematic scraping of ${sublocationsList.length} sub-locations...`);

        // Scrape each sublocation systematically
        for (const sublocation of sublocationsList) {
            try {
                console.log(`\n=== Scraping sublocation: ${sublocation.name} ===`);

                // Update sublocation status
                await db.update(sublocations).set({ status: 'scraping' }).where(eq(sublocations.id, sublocation.id));

                // Search using the combined query format requested by the user
                // e.g. "HRM around lugbe, Abuja, Nigeria"
                const combinedQuery = `${keyword} around ${sublocation.name}`;
                console.log(`Searching for: ${combinedQuery}`);

                await mapsScraper.searchLocation(combinedQuery);
                // await mapsScraper.searchKeywordsInArea(keyword); // Removed as we now use combined query

                // Extract ALL results (not limited to 20)
                const results = await mapsScraper.scrollAndExtract();
                console.log(`Found ${results.length} businesses in ${sublocation.name}`);

                // Save results with duplicate detection
                let savedCount = 0;
                for (const result of results) {
                    try {
                        // Check for duplicates by placeId first
                        if (result.placeId) {
                            const existingByPlaceId = await db.select().from(businesses)
                                .where(eq(businesses.placeId, result.placeId));
                            if (existingByPlaceId.length > 0) {
                                console.log(`Duplicate found by placeId: ${result.name}`);
                                continue;
                            }
                        }

                        // Check by name + address
                        if (result.name && result.address) {
                            const existingByNameAddress = await db.select().from(businesses)
                                .where(eq(businesses.name, result.name));
                            const duplicates = existingByNameAddress.filter(b => b.address === result.address);
                            if (duplicates.length > 0) {
                                console.log(`Duplicate found by name+address: ${result.name}`);
                                continue;
                            }
                        }

                        // Save unique business
                        await db.insert(businesses).values({
                            searchId,
                            sublocationId: sublocation.id,
                            name: result.name,
                            address: result.address,
                            rating: result.rating,
                            reviewsCount: result.reviewsCount,
                            category: result.category,
                            phone: result.phone,
                            website: result.website,
                            placeId: result.placeId,
                            coordinates: result.coordinates ? JSON.stringify(result.coordinates) : null,
                            createdAt: new Date(),
                        });
                        savedCount++;
                    } catch (insertError) {
                        console.error(`Error saving business:`, insertError);
                    }
                }

                // Update sublocation with business count and status
                await db.update(sublocations).set({
                    status: 'completed',
                    businessCount: savedCount
                }).where(eq(sublocations.id, sublocation.id));

                console.log(`Completed ${sublocation.name}: saved ${savedCount} businesses`);

            } catch (sublocationError) {
                console.error(`Error scraping sublocation ${sublocation.name}:`, sublocationError);
                await db.update(sublocations).set({ status: 'failed' }).where(eq(sublocations.id, sublocation.id));
            }
        }

        // Update search to completed after scraping
        await db.update(searches).set({
            status: 'completed',
            phase: 'completed',
            completedAt: new Date()
        }).where(eq(searches.id, searchId));

        console.log(`Search ${searchId} completed. Businesses saved, ready for selective research.`);

    } catch (error) {
        console.error(`Critical error in processScrap for search ${searchId}:`, error);

        // Give user a chance to solve any CAPTCHA before marking as failed
        console.log('⚠️  If there is a CAPTCHA, please solve it now!');
        console.log('Waiting 60 seconds for CAPTCHA resolution before marking search as failed...');
        await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds

        await db.update(searches).set({ status: 'failed' }).where(eq(searches.id, searchId));
    } finally {
        // Always clean up browser resources
        console.log('⚠️  Final chance to solve any pending CAPTCHA!');
        console.log('Closing browser in 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

        try {
            await mapsScraper.close();
        } catch (closeError) {
            console.error('Error during browser cleanup:', closeError);
        }
    }
}

export default router;
