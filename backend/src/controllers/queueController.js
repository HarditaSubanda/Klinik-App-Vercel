const queueModel = require('../models/queueModel');
const asyncHandler = require('../utils/asyncHandler');
const { todayISODate } = require('../utils/dateHelpers');
const { POLI_LIST } = require('../utils/constants');

// GET /api/queue/today?tanggal=YYYY-MM-DD (admin) - default hari ini
// Mengembalikan antrean DIKELOMPOKKAN PER POLI: { Umum: [...], Gigi: [...], Anak: [...] }
const getTodayQueue = asyncHandler(async (req, res) => {
    const tanggal = req.query.tanggal || todayISODate();
    const queue = await queueModel.findTodayQueueGroupedByPoli(tanggal);
    res.json({ success: true, tanggal, poliList: POLI_LIST, queue });
});

// POST /api/queue/next (admin, body: { tanggal?, poli }) - "Panggil Berikutnya"
// khusus untuk SATU poli (setiap poli dikelola terpisah oleh admin).
const callNext = asyncHandler(async (req, res) => {
    const tanggal = req.body.tanggal || todayISODate();
    const { poli } = req.body;

    if (!poli || !POLI_LIST.includes(poli)) {
        return res.status(400).json({
            success: false,
            message: `Poli wajib diisi dan harus salah satu dari: ${POLI_LIST.join(', ')}.`
        });
    }

    const result = await queueModel.callNext(tanggal, poli);

    if (result.blocked) {
        return res.json({
            success: true,
            message: `Nomor antrean ${result.blocked.nomor_antrean_display} (Poli ${poli}) dijadwalkan pada jam ${result.blocked.jam}. ` +
                `Saat ini masih pukul ${result.blocked.jamSaatIni} waktu klinik, jadi belum bisa dipanggil sampai sesi jadwal tersebut dimulai.`,
            ...result // result.blocked (objek info) ikut terkirim di sini
        });
    }

    if (!result.selesai && !result.sedangDilayani) {
        return res.json({
            success: true,
            message: `Tidak ada antrean yang menunggu untuk dipanggil di Poli ${poli}.`,
            ...result
        });
    }

    res.json({ success: true, message: 'Antrean berikutnya berhasil dipanggil.', ...result });
});

// GET /api/queue/summary?tanggal=&poli=&nomorAntrean= (publik)
//  - Dengan `poli`: ringkasan satu poli (dipakai halaman "Nomor Antrean" pasien).
//  - Tanpa `poli`: ringkasan SEMUA poli sekaligus (dipakai widget "Antrean
//    Saat Ini" di beranda - semua kategori nomor antrean ditampilkan).
const getSummary = asyncHandler(async (req, res) => {
    const tanggal = req.query.tanggal || todayISODate();
    const { poli } = req.query;

    if (poli) {
        if (!POLI_LIST.includes(poli)) {
            return res.status(400).json({ success: false, message: 'Poli tidak valid.' });
        }
        const nomorAntrean = req.query.nomorAntrean ? parseInt(req.query.nomorAntrean, 10) : null;
        const summary = await queueModel.getSummary(tanggal, poli, nomorAntrean);
        return res.json({ success: true, tanggal, poli, ...summary });
    }

    const poliSummaries = await queueModel.getSummaryAllPoli(tanggal);
    res.json({ success: true, tanggal, poliSummaries });
});

module.exports = { getTodayQueue, callNext, getSummary };
