import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetDb() {
    try {
        console.log('Dropping all tables...');
        await pool.query('DROP TABLE IF EXISTS enrichment_data CASCADE');
        await pool.query('DROP TABLE IF EXISTS businesses CASCADE');
        await pool.query('DROP TABLE IF EXISTS sublocations CASCADE');
        await pool.query('DROP TABLE IF EXISTS searches CASCADE');
        console.log('✓ Tables dropped successfully');
    } catch (error) {
        console.error('Error dropping tables:', error);
    } finally {
        await pool.end();
    }
}

resetDb();
