const pool = require('../config/db');

async function findByDoctor(doctorId, { activeOnly = true } = {}) {
    const where = activeOnly ? `AND status = 'Aktif'` : '';
    const { rows } = await pool.query(
        `SELECT id, doctor_id, hari, jam, status, created_at FROM doctor_schedules
         WHERE doctor_id = $1 ${where}
         ORDER BY
            array_position(ARRAY['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'], hari),
            jam ASC`,
        [doctorId]
    );
    return rows;
}

async function findById(id) {
    const { rows } = await pool.query(
        `SELECT id, doctor_id, hari, jam, status, created_at FROM doctor_schedules WHERE id = $1`,
        [id]
    );
    return rows[0] || null;
}

/**
 * Dipakai untuk validasi appointment: apakah dokter ini praktik pada hari +
 * jam tertentu, dan jadwalnya sedang aktif.
 */
async function findActiveSlot({ doctorId, hari, jam }) {
    const { rows } = await pool.query(
        `SELECT id FROM doctor_schedules
         WHERE doctor_id = $1 AND hari = $2 AND jam = $3 AND status = 'Aktif'
         LIMIT 1`,
        [doctorId, hari, jam]
    );
    return rows[0] || null;
}

async function create({ doctorId, hari, jam }) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO doctor_schedules (doctor_id, hari, jam)
             VALUES ($1, $2, $3)
             RETURNING id, doctor_id, hari, jam, status, created_at`,
            [doctorId, hari, jam]
        );
        return rows[0];
    } catch (err) {
        if (err.code === '23505') {
            const dupErr = new Error('Jadwal untuk hari & jam tersebut sudah ada untuk dokter ini.');
            dupErr.statusCode = 409;
            throw dupErr;
        }
        throw err;
    }
}

async function update(id, { hari, jam, status }) {
    try {
        const { rows } = await pool.query(
            `UPDATE doctor_schedules SET hari = $1, jam = $2, status = $3 WHERE id = $4
             RETURNING id, doctor_id, hari, jam, status, created_at`,
            [hari, jam, status, id]
        );
        return rows[0] || null;
    } catch (err) {
        if (err.code === '23505') {
            const dupErr = new Error('Jadwal untuk hari & jam tersebut sudah ada untuk dokter ini.');
            dupErr.statusCode = 409;
            throw dupErr;
        }
        throw err;
    }
}

async function remove(id) {
    const { rows } = await pool.query(
        `DELETE FROM doctor_schedules WHERE id = $1 RETURNING id`,
        [id]
    );
    return rows[0] || null;
}

module.exports = { findByDoctor, findById, findActiveSlot, create, update, remove };
