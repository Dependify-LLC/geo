import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testBackend() {
    try {
        console.log('Testing Backend API...');

        // 1. Start a search
        console.log('1. Starting search for "coffee" in "San Francisco, CA"...');
        const startResponse = await axios.post(`${API_URL}/search`, {
            location: 'San Francisco, CA',
            keyword: 'coffee'
        });

        const searchId = startResponse.data.searchId;
        console.log(`   ✓ Search started! Search ID: ${searchId}`);

        // 2. Poll for status
        console.log('2. Polling for status...');
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds timeout

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
                console.log('   Sample result:', {
                    name: results[0].name,
                    address: results[0].address,
                    rating: results[0].rating
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

testBackend();
