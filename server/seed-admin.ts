import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedAdmin() {
    try {
        console.log('Seeding admin user...');

        const username = 'admin';
        const password = 'admin123'; // Default password, should be changed immediately
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if admin exists
        const checkResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (checkResult.rows.length > 0) {
            console.log('Admin user already exists. Updating password...');
            await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hashedPassword, username]);
        } else {
            console.log('Creating new admin user...');
            await pool.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                [username, hashedPassword, 'admin']
            );
        }

        console.log('✓ Admin user seeded successfully!');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        await pool.end();
    }
}

seedAdmin();
