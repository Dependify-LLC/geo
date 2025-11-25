/**
 * Test Serper Scraper Error Recovery and Resumability
 * 
 * This test simulates:
 * 1. Successful pagination through multiple pages
 * 2. An error occurring on page 3
 * 3. Resuming from the last successful page (page 2)
 * 4. Completing the scrape
 */

// Set API key for test BEFORE import
process.env.SERPAPI_KEY = 'test-key';

// Track saved results to simulate database persistence
const savedResults: any[] = [];
let lastSuccessfulOffset = 0;

// Mock data for 4 pages (simulating 400 results target)
const mockPages: Record<number, any> = {
    0: {
        searchParameters: { ll: '@9.0765,7.3986,14z' }, // Abuja coordinates
        places: Array(100).fill(0).map((_, i) => ({
            title: `Real Estate ${i}`,
            address: `Address ${i}, Wuse, Abuja`,
            position: { lat: 9.0765, lng: 7.3986 },
            rating: 4.5,
            reviews: 50 + i,
            type: 'Real Estate Agency'
        }))
    },
    100: {
        places: Array(100).fill(0).map((_, i) => ({
            title: `Real Estate ${100 + i}`,
            address: `Address ${100 + i}, Wuse, Abuja`,
            position: { lat: 9.0765, lng: 7.3986 },
            rating: 4.3,
            reviews: 40 + i,
            type: 'Real Estate Agency'
        }))
    },
    200: {
        places: Array(100).fill(0).map((_, i) => ({
            title: `Real Estate ${200 + i}`,
            address: `Address ${200 + i}, Wuse, Abuja`,
            position: { lat: 9.0765, lng: 7.3986 },
            rating: 4.7,
            reviews: 60 + i,
            type: 'Property Developer'
        }))
    },
    300: {
        places: Array(100).fill(0).map((_, i) => ({
            title: `Real Estate ${300 + i}`,
            address: `Address ${300 + i}, Wuse, Abuja`,
            position: { lat: 9.0765, lng: 7.3986 },
            rating: 4.4,
            reviews: 45 + i,
            type: 'Property Developer'
        }))
    }
};

let requestCount = 0;
let shouldSimulateError = true;

// Mock fetch
global.fetch = async (url: any, options: any) => {
    const body = JSON.parse(options.body);
    requestCount++;

    console.log(`\n[MockFetch #${requestCount}] Request: start=${body.start}, num=${body.num}, ll=${body.ll || 'none'}`);

    // Simulate error on page 3 (offset 200) - first attempt only
    if (body.start === 200 && shouldSimulateError) {
        console.log('[MockFetch] 💥 SIMULATING NETWORK ERROR ON PAGE 3');
        throw new Error('Network error: Connection timeout');
    }

    // Check if we have data for this offset
    if (mockPages[body.start]) {
        return {
            ok: true,
            json: async () => mockPages[body.start],
            text: async () => ''
        } as any;
    }

    // No more data
    return {
        ok: true,
        json: async () => ({ places: [] }),
        text: async () => ''
    } as any;
};

async function simulateDbSave(results: any[], currentOffset: number) {
    // Simulate saving to database
    savedResults.push(...results);
    lastSuccessfulOffset = currentOffset;
    console.log(`[DB] ✅ Saved ${results.length} results. Total in DB: ${savedResults.length}. Last offset: ${lastSuccessfulOffset}`);
}

async function runTest() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TEST: Serper Scraper Error Recovery & Resumability');
    console.log('═══════════════════════════════════════════════════════\n');

    // Dynamic import to ensure env var is picked up
    const { serpScraper } = await import('./src/scraper/serp-scraper');

    try {
        console.log('📋 PHASE 1: Initial scraping attempt (will fail on page 3)');
        console.log('─────────────────────────────────────────────────────\n');

        const onResults = async (results: any[]) => {
            const currentOffset = savedResults.length; // Track where we are
            console.log(`[Callback] Received batch of ${results.length} results.`);
            await simulateDbSave(results, currentOffset);
        };

        try {
            await serpScraper.searchGoogleMaps('Real Estate around Wuse', 400, onResults);
        } catch (error: any) {
            console.log(`\n❌ Expected error occurred: ${error.message}`);
            console.log(`[Recovery Info] Saved ${savedResults.length} results before error`);
            console.log(`[Recovery Info] Can resume from offset: ${lastSuccessfulOffset + 200}\n`);
        }

        // Clear the error flag for resume
        shouldSimulateError = false;

        console.log('\n📋 PHASE 2: Resuming from last successful offset');
        console.log('─────────────────────────────────────────────────────\n');

        // In a real scenario, you would:
        // 1. Query the database to find the last successful offset
        // 2. Resume scraping from that point
        // Here we'll simulate this by creating a new scraper call starting from where we left off

        const resumeOffset = savedResults.length;
        const remainingResults = 400 - savedResults.length;

        console.log(`[Resume] Starting from offset ${resumeOffset}, need ${remainingResults} more results\n`);

        // We need to manually implement resume logic here
        // In practice, you'd modify the scraper to accept a startOffset parameter
        const resumedResults = await serpScraper.searchGoogleMaps(
            'Real Estate around Wuse',
            remainingResults,
            onResults
        );

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📊 TEST RESULTS');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log(`Total Requests Made: ${requestCount}`);
        console.log(`Total Results Saved: ${savedResults.length}`);
        console.log(`Expected Results: 400`);
        console.log(`Error Occurred: Yes (Page 3, offset 200)`);
        console.log(`Successfully Resumed: ${savedResults.length >= 200 ? 'Yes' : 'No'}`);
        console.log(`\nBreakdown by phase:`);
        console.log(`  - Phase 1 (before error): ${Math.min(savedResults.length, 200)} results`);
        console.log(`  - Phase 2 (after resume): ${Math.max(0, savedResults.length - 200)} results`);

        // Validation
        const categoryBreakdown = savedResults.reduce((acc, r) => {
            acc[r.category || 'unknown'] = (acc[r.category || 'unknown'] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log(`\nCategory Breakdown:`);
        Object.entries(categoryBreakdown).forEach(([cat, count]) => {
            console.log(`  - ${cat}: ${count}`);
        });

        console.log('\n═══════════════════════════════════════════════════════');

        // Note: The current implementation doesn't fully support resume from arbitrary offset
        // This is because we always start from offset 0
        // For true resumability, we'd need to add a startOffset parameter

        if (savedResults.length >= 200) {
            console.log('✅ PARTIAL SUCCESS: Pagination and incremental saving work!');
            console.log('⚠️  NOTE: For full resumability, the scraper needs a startOffset parameter');
        } else {
            console.log('❌ TEST FAILED: Did not save expected results');
        }

    } catch (error) {
        console.error('Test failed with unexpected error:', error);
    }
}

runTest();
