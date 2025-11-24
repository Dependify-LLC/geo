import axios from 'axios';

async function testSearch() {
    try {
        console.log('Testing POST /api/search...');
        const response = await axios.post('http://localhost:3000/api/search', {
            location: 'Brooklyn, NY',
            keyword: 'pizza'
        });
        console.log('Success!', response.data);
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

testSearch();
