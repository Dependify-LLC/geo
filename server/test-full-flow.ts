import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testFullFlow() {
    console.log('Script started...');
    try {
        console.log('Testing Full Flow (Hierarchy + Scraping + Enrichment)...');

        // 1. Start a search for a location that should have sub-locations
        const location = 'Brooklyn, NY';
        const keyword = 'pizza';
        console.log(`1. Starting search for "${keyword}" in "${location}"...`);

        const startResponse = await axios.post(`${API_URL}/search`, {
            location,
            keyword
        });

        const searchId = startResponse.data.searchId;
        console.log(`   ✓ Search started! Search ID: ${searchId}`);

        // 2. Polling for status
        console.log('2. Polling for status...');
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 60; // 120 seconds timeout (longer for full flow)

        while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const statusResponse = await axios.get(`${API_URL}/search/${searchId}`);
            status = statusResponse.data.search.status;
            const resultCount = statusResponse.data.results?.length || 0;

            // Check for enrichment data in results
            const enrichedCount = statusResponse.data.results?.filter((r: any) => r.enrichment && r.enrichment.length > 0).length || 0;

            console.log(`   Status: ${status}, Results: ${resultCount}, Enriched: ${enrichedCount}`);

            // If ready to scrape, trigger the next phase
            if (status === 'ready_to_scrape') {
                console.log('   ✓ Discovery complete. Triggering scraping phase...');
                await axios.post(`${API_URL}/search/${searchId}/scrape`);
            }

            attempts++;
        }

        if (status === 'completed') {
            console.log('   ✓ Search completed successfully!');

            // 3. Verify results
            const finalResponse = await axios.get(`${API_URL}/search/${searchId}`);
            const results = finalResponse.data.results;

            if (results.length > 0) {
                console.log(`   ✓ Found ${results.length} businesses.`);
                console.log('   Sample results:');
                results.slice(0, 3).forEach((r: any) => {
                    console.log(`     - ${r.name} (${r.rating || 'No rating'}) - ${r.address}`);
                    if (r.enrichment && r.enrichment.length > 0) {
                        console.log(`       [Enriched Data]: ${r.enrichment[0].data.substring(0, 100)}...`);
                    }
                });
            } else {
                console.warn('   ⚠ Search completed but no results found.');
            }

        } else {
            console.error(`   ✗ Search failed or timed out. Final status: ${status}`);
        }

    } catch (error: any) {
        console.error('Error testing backend:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testFullFlow();
