import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

async function pushSchema() {
    try {
        console.log('Creating database schema...');

        // Create tables directly with SQL
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS saved_locations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS searches (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                location TEXT NOT NULL,
                keyword TEXT NOT NULL,
                status TEXT NOT NULL,
                phase TEXT DEFAULT 'discovering',
                saved_location_id INTEGER REFERENCES saved_locations(id),
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sublocations (
                id SERIAL PRIMARY KEY,
                search_id INTEGER REFERENCES searches(id),
                saved_location_id INTEGER REFERENCES saved_locations(id),
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                business_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS businesses (
                id SERIAL PRIMARY KEY,
                search_id INTEGER REFERENCES searches(id),
                sublocation_id INTEGER REFERENCES sublocations(id),
                name TEXT NOT NULL,
                address TEXT,
                rating TEXT,
                reviews_count INTEGER,
                category TEXT,
                phone TEXT,
                website TEXT,
                place_id TEXT,
                coordinates TEXT,
                confidence INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS enrichment_data (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                status TEXT DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                source TEXT NOT NULL,
                data TEXT,
                confidence INTEGER DEFAULT 50,
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            );
        `);

        console.log('✓ Schema created successfully!');

        // Verify tables
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('Tables created:');
        result.rows.forEach((row: any) => console.log(`  - ${row.table_name}`));

    } catch (error) {
        console.error('Error creating schema:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

pushSchema();
