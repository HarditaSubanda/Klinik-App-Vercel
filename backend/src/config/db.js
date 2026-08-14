const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Di platform serverless (mis. Vercel) bisa ada banyak instance fungsi
    // berjalan bersamaan, masing-masing membuka pool sendiri. DB_POOL_MAX
    // membuat batas koneksi per instance bisa diatur lewat env var tanpa
    // mengubah kode - gunakan angka kecil (mis. 3-5) di Vercel, dan idealnya
    // pakai connection string yang sudah lewat pooler (PgBouncer/Supabase
    // pooler/Neon pooled connection) di DATABASE_URL.
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    idleTimeoutMillis: 10000
});

pool.on('error', (err) => {
    // Error tak terduga pada koneksi idle di pool (mis. koneksi terputus).
    // Di-log saja supaya server tidak crash total karena satu koneksi bermasalah.
    console.error('Kesalahan tak terduga pada PostgreSQL pool:', err.message);
});

pool.on('connect', () => {
    console.log('🔌 Terhubung ke PostgreSQL');
});

module.exports = pool;
