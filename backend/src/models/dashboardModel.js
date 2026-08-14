const pool = require('../config/db');
const { withNomorAntreanDisplayList } = require('../utils/queueHelpers');

/**
 * "Total Pendaftaran Hari Ini" = jumlah appointment yang DIBUAT (submit) hari
 * ini, apa pun tanggal kunjungannya. Rincian status di bawahnya menunjukkan
 * kondisi operasional klinik HARI INI (appointment dengan tanggal kunjungan
 * = hari ini), termasuk "Sedang Dilayani" yang diambil dari queue_status.
 */
async function getStatsHariIni() {
    const totalResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM appointments WHERE dibuat_pada::date = CURRENT_DATE`
    );

    const statusResult = await pool.query(
        `SELECT status, queue_status, COUNT(*)::int AS jumlah
         FROM appointments
         WHERE tanggal = CURRENT_DATE
         GROUP BY status, queue_status`
    );

    const counts = { menunggu: 0, dikonfirmasi: 0, sedangDilayani: 0, selesai: 0, dibatalkan: 0 };
    for (const row of statusResult.rows) {
        if (row.status === 'Menunggu') counts.menunggu += row.jumlah;
        else if (row.status === 'Dikonfirmasi' && row.queue_status === 'Dipanggil') counts.sedangDilayani += row.jumlah;
        else if (row.status === 'Dikonfirmasi') counts.dikonfirmasi += row.jumlah;
        else if (row.status === 'Selesai') counts.selesai += row.jumlah;
        else if (row.status === 'Dibatalkan') counts.dibatalkan += row.jumlah;
    }

    return {
        totalPendaftaranHariIni: totalResult.rows[0].total,
        menungguKonfirmasi: counts.menunggu,
        dikonfirmasi: counts.dikonfirmasi,
        sedangDilayani: counts.sedangDilayani,
        selesai: counts.selesai,
        dibatalkan: counts.dibatalkan
    };
}

async function getRecentAppointments(limit = 5) {
    const { rows } = await pool.query(
        `SELECT id, kode_pendaftaran, nama_pasien, poli, dokter, tanggal, jam, status, dibuat_pada
         FROM appointments ORDER BY dibuat_pada DESC LIMIT $1`,
        [limit]
    );
    return rows;
}

async function getActiveQueue(limit = 5) {
    // Diurutkan per poli dulu (bukan cuma nomor_antrean) karena sejak nomor
    // antrean dipisah per poli, nomor mentahnya bisa "kebetulan sama" antar
    // poli berbeda (mis. Umum #1 dan Gigi #1) - supaya daftar ini tetap rapi
    // dikelompokkan per poli, baru diurutkan nomor di dalamnya.
    const { rows } = await pool.query(
        `SELECT id, nomor_antrean, nama_pasien, poli, dokter, jam, queue_status
         FROM appointments
         WHERE tanggal = CURRENT_DATE AND status = 'Dikonfirmasi' AND nomor_antrean IS NOT NULL
         ORDER BY poli ASC, nomor_antrean ASC LIMIT $1`,
        [limit]
    );
    return withNomorAntreanDisplayList(rows);
}

async function getPendingConfirmation(limit = 5) {
    const { rows } = await pool.query(
        `SELECT id, kode_pendaftaran, nama_pasien, poli, dokter, tanggal, jam, dibuat_pada
         FROM appointments WHERE status = 'Menunggu'
         ORDER BY dibuat_pada ASC LIMIT $1`,
        [limit]
    );
    return rows;
}

module.exports = { getStatsHariIni, getRecentAppointments, getActiveQueue, getPendingConfirmation };
