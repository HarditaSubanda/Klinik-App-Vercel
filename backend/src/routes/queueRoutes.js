const express = require('express');
const router = express.Router();

const { getTodayQueue, callNext, getSummary } = require('../controllers/queueController');
const { requireAuth } = require('../middleware/authMiddleware');

// --- Publik (Fitur 3: halaman "Nomor Antrean" pasien - ringkasan tanpa nama orang lain) ---
// GET /api/queue/summary          -> ringkasan SEMUA poli (widget beranda)
// GET /api/queue/summary?poli=... -> ringkasan SATU poli (cek nomor antrean pasien)
router.get('/summary', getSummary);

// --- Khusus admin (Fitur 4: "Manajemen Antrean", sekarang per poli) ---
router.get('/today', requireAuth, getTodayQueue);
// POST body: { tanggal?, poli } - poli wajib diisi, lihat queueController.js
router.post('/next', requireAuth, callNext);

module.exports = router;
