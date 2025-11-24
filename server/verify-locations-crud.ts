import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function verifyLocationsCRUD() {
    try {
        console.log('=== Locations CRUD Verification ===');

        // 1. Login as Admin
        console.log('\n1. Logging in as Admin...');
        const login = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const token = login.data.token;
        console.log('✓ Logged in');

        // 2. Create a test location via a search (we can't create locations directly, they're created during discovery)
        // So let's work with existing locations

        // 3. Get all locations
        console.log('\n2. Fetching locations...');
        const locationsRes = await axios.get(`${API_URL}/locations`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✓ Found ${locationsRes.data.length} locations`);

        if (locationsRes.data.length > 0) {
            const testLoc = locationsRes.data[0];
            console.log(`\nUsing location: ${testLoc.name} (ID: ${testLoc.id})`);

            // 4. Add a sublocation
            console.log('\n3. Adding a new sublocation...');
            const addRes = await axios.post(`${API_URL}/locations/${testLoc.id}/sublocations`, {
                name: 'Test Sublocation',
                type: 'district'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ Sublocation added:', addRes.data.sublocation.id);
            const newSubId = addRes.data.sublocation.id;

            // 5. Update the sublocation
            console.log('\n4. Updating sublocation...');
            await axios.put(`${API_URL}/locations/${testLoc.id}/sublocations/${newSubId}`, {
                name: 'Updated Test Sublocation',
                type: 'neighborhood'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ Sublocation updated');

            // 6. Get sublocations to verify
            const subsRes = await axios.get(`${API_URL}/locations/${testLoc.id}/sublocations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedSub = subsRes.data.sublocations.find((s: any) => s.id === newSubId);
            console.log('✓ Verified:', updatedSub.name, '-', updatedSub.type);

            // 7. Delete the sublocation
            console.log('\n5. Deleting sublocation...');
            await axios.delete(`${API_URL}/locations/${testLoc.id}/sublocations/${newSubId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ Sublocation deleted');

            // 8. Update location name
            console.log('\n6. Updating location name...');
            const originalName = testLoc.name;
            await axios.put(`${API_URL}/locations/${testLoc.id}`, {
                name: originalName + ' (Updated)'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ Location name updated');

            // Restore original name
            await axios.put(`${API_URL}/locations/${testLoc.id}`, {
                name: originalName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ Location name restored');

            console.log('\n=== All CRUD Operations Verified ✓ ===');
        } else {
            console.log('\nℹ No locations found. Run a search first to create locations.');
        }

    } catch (error: any) {
        console.error('\n❌ Verification Failed:', error.response?.data || error.message);
    }
}

verifyLocationsCRUD();
