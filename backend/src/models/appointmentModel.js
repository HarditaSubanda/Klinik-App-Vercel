const pool = require('../config/db');
const { todayISODate } = require('../utils/dateHelpers');
const { KODE_PREFIX } = require('../utils/constants');
const { withNomorAntreanDisplay, withNomorAntreanDisplayList } = require('../utils/queueHelpers');

/**
 * Cek apakah slot (dokter + tanggal + jam) sudah dikonfirmasi sebelumnya.
 */
async function findConfirmedConflict({ dokter, tanggal, jam }) {
    const { rows } = await pool.query(
        `SELECT id FROM appointments
         WHERE dokter = $1 AND tanggal = $2 AND jam = $3 AND status = 'Dikonfirmasi'
         LIMIT 1`,
        [dokter, tanggal, jam]
    );
    return rows[0] || null;
}

/**
 * Bentuk kode pendaftaran berikutnya untuk HARI INI (tanggal pendaftaran,
 * bukan tanggal kunjungan), format KLN-YYYYMMDD-001, urut per hari.
 * Dipanggil di dalam retry-loop create() supaya aman dari race condition
 * (dua pendaftaran bersamaan mendapat kode yang sama) - lihat catch 23505 di
 * bawah untuk penanganannya.
 */
async function generateNextKode() {
    const todayCompact = todayISODate().replace(/-/g, '');
    const prefix = `${KODE_PREFIX}-${todayCompact}-`;
    const { rows } = await pool.query(
        `SELECT kode_pendaftaran FROM appointments
         WHERE kode_pendaftaran LIKE $1
         ORDER BY kode_pendaftaran DESC
         LIMIT 1`,
        [`${prefix}%`]
    );
    let nextSeq = 1;
    if (rows[0] && rows[0].kode_pendaftaran) {
        const lastSeq = parseInt(rows[0].kode_pendaftaran.slice(prefix.length), 10);
        if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

async function create(data) {
    const { namaPasien, nik, noHp, poli, dokter, doctorId, tanggal, jam, keluhan } = data;
    const MAX_RETRY = 5;

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
        const kode = await generateNextKode();
        try {
            const { rows } = await pool.query(
                `INSERT INTO appointments
                    (nama_pasien, nik, no_hp, poli, dokter, doctor_id, tanggal, jam, keluhan, status, kode_pendaftaran)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Menunggu', $10)
                 RETURNING *`,
                [namaPasien, nik, noHp, poli, dokter, doctorId || null, tanggal, jam, keluhan || null, kode]
            );
            return withNomorAntreanDisplay(rows[0]);
        } catch (err) {
            // 23505 = unique_violation.
            if (err.code === '23505' && err.constraint === 'appointments_kode_pendaftaran_key') {
                // Tabrakan kode pendaftaran (dua request datang di detik yang
                // sama) - sangat jarang, coba generate ulang.
                continue;
            }
            if (err.code === '23505') {
                // idx_unique_confirmed_slot atau constraint unik lain - dijaga
                // sebagai pengaman terakhir terhadap race condition booking bentrok.
                const conflictError = new Error(
                    `Jadwal pada tanggal ${tanggal} jam ${jam} untuk ${dokter} baru saja dikonfirmasi oleh pasien lain.`
                );
                conflictError.statusCode = 409;
                throw conflictError;
            }
            throw err;
        }
    }

    const err = new Error('Gagal membuat kode pendaftaran, silakan coba lagi.');
    err.statusCode = 500;
    throw err;
}

/**
 * Ambil daftar janji temu dengan filter opsional, pencarian, dan paginasi.
 * Dipakai oleh dashboard admin agar tidak perlu menarik seluruh data sekaligus.
 */
async function findAll({ status, poli, search, tanggal, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
        conditions.push(`status = $${idx++}`);
        values.push(status);
    }
    if (poli) {
        conditions.push(`poli = $${idx++}`);
        values.push(poli);
    }
    if (tanggal) {
        conditions.push(`tanggal = $${idx++}`);
        values.push(tanggal);
    }
    if (search) {
        conditions.push(`(nama_pasien ILIKE $${idx} OR no_hp ILIKE $${idx} OR nik ILIKE $${idx} OR kode_pendaftaran ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const dataQuery = `
        SELECT * FROM appointments
        ${whereClause}
        ORDER BY tanggal DESC, id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const countQuery = `SELECT COUNT(*)::int AS total FROM appointments ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [...values, safeLimit, offset]),
        pool.query(countQuery, values)
    ]);

    return {
        data: withNomorAntreanDisplayList(dataResult.rows),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: countResult.rows[0].total,
            totalPages: Math.ceil(countResult.rows[0].total / safeLimit) || 1
        }
    };
}

async function findById(id) {
    const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    return withNomorAntreanDisplay(rows[0]) || null;
}

/**
 * Cek Pendaftaran (Fitur 2): cari SATU appointment lewat kode + no HP
 * sekaligus, supaya orang yang salah satu datanya (kode atau HP) tidak tahu
 * tidak bisa melihat data pendaftaran milik orang lain.
 */
async function findByKodeAndNoHp(kode, noHp) {
    const { rows } = await pool.query(
        `SELECT * FROM appointments WHERE kode_pendaftaran = $1 AND no_hp = $2 LIMIT 1`,
        [kode, noHp]
    );
    return withNomorAntreanDisplay(rows[0]) || null;
}

/**
 * Riwayat Pendaftaran (Fitur 7): semua appointment milik satu no HP, terbaru
 * lebih dulu. Tidak perlu akun pasien - identifikasi cukup lewat no HP yang
 * sama dipakai saat mendaftar.
 */
async function findHistoryByNoHp(noHp) {
    const { rows } = await pool.query(
        `SELECT * FROM appointments WHERE no_hp = $1 ORDER BY dibuat_pada DESC`,
        [noHp]
    );
    return withNomorAntreanDisplayList(rows);
}

/**
 * Update status (dipakai admin). Kalau status baru = 'Dikonfirmasi' dan
 * appointment ini belum punya nomor antrean, nomor antrean otomatis
 * di-assign (urut per tanggal kunjungan). Status selain 'Dikonfirmasi'
 * selalu melepas queue_status (appointment tidak lagi "aktif" di antrean).
 * Dijalankan dalam transaksi + row lock + retry supaya aman dari race
 * condition (mis. dua appointment di slot sama dikonfirmasi bersamaan, atau
 * nomor antrean bentrok).
 */
async function updateStatus(id, status) {
    const MAX_RETRY = 3;

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const current = await client.query(
                `SELECT * FROM appointments WHERE id = $1 FOR UPDATE`,
                [id]
            );
            if (!current.rows[0]) {
                await client.query('ROLLBACK');
                return null;
            }
            const appointment = current.rows[0];

            let nomorAntrean = appointment.nomor_antrean;
            let queueStatus = appointment.queue_status;

            if (status === 'Dikonfirmasi') {
                if (!nomorAntrean) {
                    // v4: nomor antrean sekarang per (tanggal, POLI) - setiap poli
                    // punya serinya sendiri mulai dari 1, bukan berbagi satu seri
                    // global lagi. Lihat idx_unique_antrean_per_tanggal_poli di
                    // schema.sql & utils/queueHelpers.js untuk awalan hurufnya.
                    const maxResult = await client.query(
                        `SELECT COALESCE(MAX(nomor_antrean), 0) AS max_antrean
                         FROM appointments WHERE tanggal = $1 AND poli = $2`,
                        [appointment.tanggal, appointment.poli]
                    );
                    nomorAntrean = maxResult.rows[0].max_antrean + 1;
                    queueStatus = 'Menunggu';
                }
            } else {
                queueStatus = null;
            }

            const { rows } = await client.query(
                `UPDATE appointments
                 SET status = $1, nomor_antrean = $2, queue_status = $3, updated_at = NOW()
                 WHERE id = $4
                 RETURNING *`,
                [status, nomorAntrean, queueStatus, id]
            );

            await client.query('COMMIT');
            return withNomorAntreanDisplay(rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            if (err.code === '23505' && err.constraint === 'idx_unique_antrean_per_tanggal_poli') {
                // Nomor antrean bentrok karena ada konfirmasi lain persis di
                // waktu yang sama - coba lagi dengan nomor berikutnya.
                continue;
            }
            if (err.code === '23505') {
                const conflictError = new Error(
                    'Slot jadwal dokter ini sudah dikonfirmasi untuk pasien lain pada tanggal & jam yang sama.'
                );
                conflictError.statusCode = 409;
                throw conflictError;
            }
            throw err;
        } finally {
            client.release();
        }
    }

    const err = new Error('Gagal memperbarui status, silakan coba lagi.');
    err.statusCode = 500;
    throw err;
}

/**
 * Pembatalan (Fitur 8). Hanya berhasil kalau status saat ini masih
 * Menunggu/Dikonfirmasi (dijaga di query WHERE, bukan cuma dicek di kode,
 * supaya aman dari race condition). Dipakai baik oleh pasien (setelah
 * verifikasi kode+HP di controller) maupun admin.
 */
async function cancel(id) {
    const existing = await findById(id);
    if (!existing) {
        return { ok: false, reason: 'not_found' };
    }
    if (!['Menunggu', 'Dikonfirmasi'].includes(existing.status)) {
        return { ok: false, reason: 'not_cancellable', appointment: existing };
    }

    const { rows } = await pool.query(
        `UPDATE appointments
         SET status = 'Dibatalkan', queue_status = NULL, updated_at = NOW()
         WHERE id = $1 AND status IN ('Menunggu', 'Dikonfirmasi')
         RETURNING *`,
        [id]
    );
    if (!rows[0]) {
        return { ok: false, reason: 'not_cancellable' };
    }
    return { ok: true, appointment: rows[0] };
}

async function remove(id) {
    const { rows } = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
}

module.exports = {
    findConfirmedConflict,
    create,
    findAll,
    findById,
    findByKodeAndNoHp,
    findHistoryByNoHp,
    updateStatus,
    cancel,
    remove
};
