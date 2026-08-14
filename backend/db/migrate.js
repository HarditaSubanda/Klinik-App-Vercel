/**
 * Menjalankan db/schema.sql terhadap database yang dikonfigurasi di .env
 * Jalankan dengan: npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Menjalankan migrasi skema database...');
    try {
        await pool.query(sql);
        console.log('✅ Migrasi berhasil. Tabel admins & appointments siap digunakan.');
    } catch (err) {
        console.error('❌ Migrasi gagal:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrate();
