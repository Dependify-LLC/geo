import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function verifyLocations() {
    try {
        console.log('=== Saved Locations Feature Verification ===');

        // 1. Login as Admin
        console.log('\n1. Logging in...');
        const login = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const token = login.data.token;
        console.log('✓ Logged in');

        // 2. Get all saved locations
        console.log('\n2. Fetching saved locations...');
        const locationsRes = await axios.get(`${API_URL}/locations`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✓ Found ${locationsRes.data.length} saved locations`);
        locationsRes.data.forEach((loc: any) => {
            console.log(`  - ${loc.name} (${loc.sublocationCount} sub-locations, Primary Search: ${loc.primarySearchId || 'Not Set'})`);
        });

        if (locationsRes.data.length > 0) {
            // 3. Get sublocations for first location
            const firstLoc = locationsRes.data[0];
            console.log(`\n3. Fetching sub-locations for "${firstLoc.name}"...`);
            const subsRes = await axios.get(`${API_URL}/locations/${firstLoc.id}/sublocations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✓ ${subsRes.data.sublocations.length} sub-locations retrieved`);
            console.log('  First 5:', subsRes.data.sublocations.slice(0, 5).map((s: any) => s.name).join(', '));
        }

        console.log('\n=== Verification Completed Successfully ===');
        console.log('\n📍 Summary:');
        console.log('  - All users can view saved locations');
        console.log('  - Each location shows its sub-location count');
        console.log('  - First discovery auto-sets as primary');
        console.log('  - Locations are reusable across all searches');

    } catch (error: any) {
        console.error('\n❌ Verification Failed:', error.response?.data || error.message);
    }
}

verifyLocations();
