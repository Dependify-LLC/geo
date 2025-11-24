import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function verifySearch6() {
    try {
        console.log('Verifying Search 6 results...');
        const response = await axios.get(`${API_URL}/search/6`);

        const search = response.data.search;
        const results = response.data.results;

        console.log('Search Status:', search.status);
        console.log('Results Count:', results.length);

        if (results.length > 0) {
            console.log('Sample Result:', results[0]);
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

verifySearch6();
