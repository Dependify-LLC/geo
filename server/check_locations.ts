
import { db } from './src/db';
import { savedLocations } from './src/db/schema';

async function check() {
    try {
        console.log('Checking database connection...');
        const locations = await db.select().from(savedLocations);
        console.log('Saved Locations found:', locations.length);
        console.log(JSON.stringify(locations, null, 2));
    } catch (error) {
        console.error('Database error:', error);
    }
    process.exit(0);
}

check();
