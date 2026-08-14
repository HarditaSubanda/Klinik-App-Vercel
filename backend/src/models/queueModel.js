const pool = require('../config/db');
const { POLI_LIST } = require('../utils/constants');
const { getCurrentTimeHHMM, isJamSlotStarted } = require('../utils/dateHelpers');
const { withNomorAntreanDisplay, withNomorAntreanDisplayList } = require('../utils/queueHelpers');

/**
 * Daftar antrean HARI/TANGGAL tertentu, DIKELOMPOKKAN PER POLI (khusus admin
 * - "Manajemen Antrean"). Hanya appointment yang sudah Dikonfirmasi & sudah
 * punya nomor antrean. Dikelompokkan per poli karena setiap poli sekarang
 * punya seri nomor antreannya sendiri (A-xxx, B-xxx, C-xxx) dan dikelola
 * terpisah oleh admin (tombol "Panggil Berikutnya" sendiri-sendiri).
 */
async function findTodayQueueGroupedByPoli(tanggal) {
    const { rows } = await pool.query(
        `SELECT id, nomor_antrean, nama_pasien, poli, dokter, jam, queue_status, status
         FROM appointments
         WHERE tanggal = $1 AND status = 'Dikonfirmasi' AND nomor_antrean IS NOT NULL
         ORDER BY poli ASC, nomor_antrean ASC`,
        [tanggal]
    );
    const withDisplay = withNomorAntreanDisplayList(rows);

    const grouped = {};
    for (const poli of POLI_LIST) grouped[poli] = [];
    for (const row of withDisplay) {
        if (!grouped[row.poli]) grouped[row.poli] = [];
        grouped[row.poli].push(row);
    }
    return grouped;
}

/**
 * Antrean untuk SATU poli tertentu saja (dipakai internal oleh callNext, dan
 * bisa juga dipakai kalau suatu saat perlu endpoint per-poli tunggal).
 */
async function findTodayQueueByPoli(tanggal, poli) {
    const { rows } = await pool.query(
        `SELECT id, nomor_antrean, nama_pasien, poli, dokter, jam, queue_status, status
         FROM appointments
         WHERE tanggal = $1 AND poli = $2 AND status = 'Dikonfirmasi' AND nomor_antrean IS NOT NULL
         ORDER BY nomor_antrean ASC`,
        [tanggal, poli]
    );
    return withNomorAntreanDisplayList(rows);
}

/**
 * "Panggil Antrean Berikutnya" - SEKARANG PER POLI (setiap poli punya alur
 * antreannya sendiri, tidak saling mengganggu):
 *  1. Yang sedang dilayani di poli ini (queue_status = 'Dipanggil') -> selesai.
 *     Langkah ini SELALU dijalankan (menutup sesi konsultasi yang memang
 *     sudah berlangsung, tidak tergantung aturan jam).
 *  2. Antrean menunggu paling depan di poli ini (nomor terkecil) -> baru
 *     dipanggil (jadi 'Dipanggil') KALAU jam jadwal appointment tsb SUDAH
 *     dimulai (lihat aturan "batas jam lokal" di bawah). Kalau belum, antrean
 *     TIDAK dilanjutkan ke nomor berikutnya - hasil `blocked` dikembalikan
 *     berisi info nomor & jam yang harus ditunggu, dan `sedangDilayani`
 *     bernilai null (tidak ada yang sedang dipanggil sampai admin klik lagi
 *     setelah jamnya tiba).
 *
 * ATURAN JAM LOKAL (sesuai permintaan): nomor antrean untuk sesi jadwal yang
 * BELUM DIMULAI (mis. sesi 13:00-15:00) tidak boleh dipanggil selama jam
 * lokal klinik belum menyentuh jam mulai sesi tsb, WALAUPUN nomor sebelumnya
 * (dari sesi lebih awal, mis. 10:00-12:00) sudah selesai dilayani lebih cepat
 * dari jadwal. Ini mencegah antrean "meloncat" ke sesi jadwal dokter
 * berikutnya sebelum waktunya, sesuai jadwal praktik dokter yang tersedia.
 *
 * Dijalankan dalam satu transaksi + row lock supaya aman dari race condition
 * kalau tombol ditekan dua kali dengan cepat.
 */
async function callNext(tanggal, poli) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const current = await client.query(
            `SELECT id FROM appointments
             WHERE tanggal = $1 AND poli = $2 AND status = 'Dikonfirmasi' AND queue_status = 'Dipanggil'
             LIMIT 1 FOR UPDATE`,
            [tanggal, poli]
        );
        let selesai = null;
        if (current.rows[0]) {
            const upd = await client.query(
                `UPDATE appointments SET status = 'Selesai', queue_status = NULL, updated_at = NOW()
                 WHERE id = $1 RETURNING *`,
                [current.rows[0].id]
            );
            selesai = withNomorAntreanDisplay(upd.rows[0]);
        }

        const next = await client.query(
            `SELECT id, nomor_antrean, jam, nama_pasien, poli FROM appointments
             WHERE tanggal = $1 AND poli = $2 AND status = 'Dikonfirmasi' AND queue_status = 'Menunggu'
             ORDER BY nomor_antrean ASC LIMIT 1 FOR UPDATE`,
            [tanggal, poli]
        );

        let sedangDilayani = null;
        let blocked = null;

        if (next.rows[0]) {
            const kandidat = next.rows[0];
            const nowHHMM = getCurrentTimeHHMM();

            if (isJamSlotStarted(kandidat.jam, nowHHMM)) {
                const upd = await client.query(
                    `UPDATE appointments SET queue_status = 'Dipanggil', updated_at = NOW()
                     WHERE id = $1 RETURNING *`,
                    [kandidat.id]
                );
                sedangDilayani = withNomorAntreanDisplay(upd.rows[0]);
            } else {
                // Sesi jadwal untuk nomor berikutnya belum dimulai - jangan
                // dipanggil dulu. Beritahu admin nomor & jam berapa yang
                // harus ditunggu supaya UI bisa menampilkan pesan yang jelas.
                blocked = withNomorAntreanDisplay({
                    ...kandidat,
                    jamSaatIni: nowHHMM
                });
            }
        }

        await client.query('COMMIT');
        return { selesai, sedangDilayani, blocked };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Ringkasan antrean SATU POLI untuk halaman publik "Nomor Antrean" pasien -
 * TIDAK mengembalikan nama pasien lain (privasi), hanya nomor yang sedang
 * dilayani (di poli itu) dan jumlah antrean di depan nomor milik pasien yang
 * bertanya (juga dihitung khusus di poli yang sama, karena nomor antrean
 * antar poli tidak lagi saling berkaitan).
 */
async function getSummary(tanggal, poli, nomorAntrean) {
    const currentResult = await pool.query(
        `SELECT nomor_antrean FROM appointments
         WHERE tanggal = $1 AND poli = $2 AND status = 'Dikonfirmasi' AND queue_status = 'Dipanggil'
         LIMIT 1`,
        [tanggal, poli]
    );
    const nomorSedangDilayani = currentResult.rows[0] ? currentResult.rows[0].nomor_antrean : null;

    const totalMenungguResult = await pool.query(
        `SELECT COUNT(*)::int AS jumlah FROM appointments
         WHERE tanggal = $1 AND poli = $2 AND status = 'Dikonfirmasi' AND queue_status = 'Menunggu'`,
        [tanggal, poli]
    );
    const totalMenunggu = totalMenungguResult.rows[0].jumlah;

    let jumlahDiDepan = 0;
    if (nomorAntrean) {
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS jumlah FROM appointments
             WHERE tanggal = $1 AND poli = $2 AND status = 'Dikonfirmasi' AND queue_status = 'Menunggu'
               AND nomor_antrean < $3`,
            [tanggal, poli, nomorAntrean]
        );
        jumlahDiDepan = countResult.rows[0].jumlah;
    }

    return {
        nomorSedangDilayani,
        nomorSedangDilayaniDisplay: nomorSedangDilayani
            ? withNomorAntreanDisplay({ poli, nomor_antrean: nomorSedangDilayani }).nomor_antrean_display
            : null,
        jumlahDiDepan,
        totalMenunggu
    };
}

/**
 * Ringkasan antrean SEMUA POLI sekaligus - dipakai widget "Antrean Saat Ini"
 * di halaman BERANDA (Fitur: semua kategori nomor antrean ditampilkan di
 * beranda). Mengembalikan satu ringkasan per poli, urut sesuai POLI_LIST.
 */
async function getSummaryAllPoli(tanggal) {
    const hasil = [];
    for (const poli of POLI_LIST) {
        const ringkasan = await getSummary(tanggal, poli, null);
        hasil.push({ poli, ...ringkasan });
    }
    return hasil;
}

module.exports = {
    findTodayQueueGroupedByPoli,
    findTodayQueueByPoli,
    callNext,
    getSummary,
    getSummaryAllPoli
};
