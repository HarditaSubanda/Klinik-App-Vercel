const pool = require('../config/db');

async function findByUsername(username) {
    const { rows } = await pool.query(
        'SELECT id, username, password_hash, nama_lengkap FROM admins WHERE username = $1',
        [username]
    );
    return rows[0] || null;
}

async function findById(id) {
    const { rows } = await pool.query(
        'SELECT id, username, nama_lengkap, created_at FROM admins WHERE id = $1',
        [id]
    );
    return rows[0] || null;
}

async function create({ username, passwordHash, namaLengkap }) {
    const { rows } = await pool.query(
        `INSERT INTO admins (username, password_hash, nama_lengkap)
         VALUES ($1, $2, $3)
         RETURNING id, username, nama_lengkap, created_at`,
        [username, passwordHash, namaLengkap || null]
    );
    return rows[0];
}

module.exports = { findByUsername, findById, create };
