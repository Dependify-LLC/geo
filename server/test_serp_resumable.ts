
// Set API key for test BEFORE import
process.env.SERPAPI_KEY = 'test-key';

// Mock fetch
const originalFetch = global.fetch;

// Mock data for 2 pages
const page1Data = {
    searchParameters: { ll: '@1.2,3.4,14z' },
    places: Array(100).fill(0).map((_, i) => ({ title: `Business ${i}`, position: { lat: 1, lng: 2 } }))
};
const page2Data = {
    places: Array(50).fill(0).map((_, i) => ({ title: `Business ${100 + i}`, position: { lat: 1, lng: 2 } }))
};

global.fetch = async (url: any, options: any) => {
    const body = JSON.parse(options.body);
    console.log(`\n[MockFetch] Request: start=${body.start}, num=${body.num}, ll=${body.ll}`);

    if (body.start === 0) {
        return {
            ok: true,
            json: async () => page1Data,
            text: async () => ''
        } as any;
    } else if (body.start === 100) {
        return {
            ok: true,
            json: async () => page2Data,
            text: async () => ''
        } as any;
    }

    return { ok: false, status: 404 } as any;
};

async function runTest() {
    console.log('Starting Resumable Serper Test...');

    // Dynamic import to ensure env var is picked up
    const { serpScraper } = await import('./src/scraper/serp-scraper');

    let pageCount = 0;
    let totalSaved = 0;

    const onResults = async (results: any[]) => {
        pageCount++;
        totalSaved += results.length;
        console.log(`[Callback] Received batch of ${results.length} results. (Total saved: ${totalSaved})`);
        console.log(`[Callback] Simulating DB save for batch ${pageCount}... DONE`);
    };

    try {
        const results = await serpScraper.searchGoogleMaps('test query', 200, onResults);
        console.log(`\nTest Completed! Total results returned: ${results.length}`);

        if (pageCount === 2 && totalSaved === 150) {
            console.log('✅ SUCCESS: Pagination worked and callback received all results incrementally.');
        } else {
            console.error(`❌ FAILED: Counts do not match expected values. PageCount: ${pageCount}, TotalSaved: ${totalSaved}`);
        }

    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

runTest();
