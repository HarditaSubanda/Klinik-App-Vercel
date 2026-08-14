const pool = require('../config/db');

/**
 * Dokter aktif saja (dipakai halaman publik: form booking, jadwal dokter).
 */
async function findAllActive() {
    const { rows } = await pool.query(
        `SELECT id, nama, poli, status, created_at FROM doctors
         WHERE status = 'Aktif'
         ORDER BY nama ASC`
    );
    return rows;
}

/**
 * Semua dokter termasuk nonaktif (dipakai dashboard admin - Manajemen Dokter).
 */
async function findAll() {
    const { rows } = await pool.query(
        `SELECT id, nama, poli, status, created_at FROM doctors ORDER BY nama ASC`
    );
    return rows;
}

async function findById(id) {
    const { rows } = await pool.query(
        `SELECT id, nama, poli, status, created_at FROM doctors WHERE id = $1`,
        [id]
    );
    return rows[0] || null;
}

/**
 * Dipakai untuk mencocokkan field `dokter` (nama, teks bebas) yang dikirim
 * form booking dengan baris dokter yang sesungguhnya di database - menjaga
 * kompatibilitas dengan kontrak API lama (POST /api/appointments masih
 * menerima nama dokter sebagai string, bukan ID).
 */
async function findByName(nama) {
    const { rows } = await pool.query(
        `SELECT id, nama, poli, status FROM doctors WHERE nama = $1`,
        [nama]
    );
    return rows[0] || null;
}

async function create({ nama, poli }) {
    const { rows } = await pool.query(
        `INSERT INTO doctors (nama, poli) VALUES ($1, $2)
         RETURNING id, nama, poli, status, created_at`,
        [nama, poli]
    );
    return rows[0];
}

async function update(id, { nama, poli, status }) {
    const { rows } = await pool.query(
        `UPDATE doctors SET nama = $1, poli = $2, status = $3 WHERE id = $4
         RETURNING id, nama, poli, status, created_at`,
        [nama, poli, status, id]
    );
    return rows[0] || null;
}

/**
 * "Hapus" dokter = nonaktifkan (soft delete), BUKAN hapus baris.
 * Ini disengaja: appointments lama masih punya doctor_id yang menunjuk ke
 * dokter ini, jadi menghapus baris akan merusak riwayat appointment lama
 * (melanggar aturan "jangan menghapus data lama"). Dokter yang nonaktif
 * otomatis tidak muncul lagi di form booking / jadwal dokter publik.
 */
async function deactivate(id) {
    const { rows } = await pool.query(
        `UPDATE doctors SET status = 'Nonaktif' WHERE id = $1
         RETURNING id, nama, poli, status, created_at`,
        [id]
    );
    return rows[0] || null;
}

module.exports = { findAllActive, findAll, findById, findByName, create, update, deactivate };
