import { Pool } from 'pg';

const adminPool = new Pool({
    connectionString: 'postgres://postgres:rXgNx0MMimBIJi4v5mJ7qHBVuwvbRQRF3K9773bG9wPGjSlavh3sszgEJPjxYSsl@20.14.88.69:5432/postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

async function createDatabase() {
    try {
        // Check if database exists
        const result = await adminPool.query(
            "SELECT 1 FROM pg_database WHERE datname='geomaster_bi'"
        );

        if (result.rows.length === 0) {
            // Create database
            await adminPool.query('CREATE DATABASE geomaster_bi');
            console.log('✓ Database geomaster_bi created successfully!');
        } else {
            console.log('✓ Database geomaster_bi already exists.');
        }
    } catch (error) {
        console.error('Error creating database:', error);
        throw error;
    } finally {
        await adminPool.end();
    }
}

createDatabase();
