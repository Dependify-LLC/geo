import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
    try {
        console.log('Checking users table...');

        const result = await pool.query('SELECT id, username, role, password_hash FROM users');

        console.log(`Found ${result.rows.length} users:`);
        result.rows.forEach(u => {
            console.log(`- ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, Hash: ${u.password_hash.substring(0, 20)}...`);
        });

    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await pool.end();
    }
}

checkUsers();
