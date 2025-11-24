import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testBackendV2() {
    console.log('Script started...');
    try {
        console.log('Testing Backend API (Scenario 2)...');

        // 1. Start a search
        console.log('1. Starting search for "pizza" in "New York, NY"...');
        const startResponse = await axios.post(`${API_URL}/search`, {
            location: 'New York, NY',
            keyword: 'pizza'
        });

        const searchId = startResponse.data.searchId;
        console.log(`   ✓ Search started! Search ID: ${searchId}`);

        // 2. Poll for status
        console.log('2. Polling for status...');
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 45; // 90 seconds timeout

        while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const statusResponse = await axios.get(`${API_URL}/search/${searchId}`);
            status = statusResponse.data.search.status;
            const resultCount = statusResponse.data.results?.length || 0;

            console.log(`   Status: ${status}, Results found: ${resultCount}`);
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

testBackendV2();
