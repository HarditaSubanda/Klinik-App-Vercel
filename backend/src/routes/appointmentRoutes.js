const express = require('express');
const router = express.Router();

const {
    createAppointment,
    checkAvailability,
    lookupAppointment,
    getHistory,
    cancelAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    deleteAppointment
} = require('../controllers/appointmentController');

const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { bookingLimiter } = require('../middleware/rateLimiter');
const {
    createAppointmentRules,
    updateStatusRules,
    checkAvailabilityRules,
    lookupRules,
    historyRules,
    cancelRules
} = require('../utils/appointmentValidators');

// --- Publik (dipakai halaman booking & pengecekan pasien) ---
// PENTING: rute statis (/lookup, /history, /check-availability) HARUS
// dideklarasikan SEBELUM rute dinamis GET '/:id' di bawah, supaya Express
// tidak salah mencocokkan '/lookup' sebagai id='lookup'.
router.post('/', bookingLimiter, createAppointmentRules, createAppointment);
router.get('/check-availability', checkAvailabilityRules, checkAvailability);
router.get('/lookup', lookupRules, lookupAppointment);       // Fitur 2: Cek Pendaftaran
router.get('/history', historyRules, getHistory);            // Fitur 7: Riwayat Pendaftaran

// --- Dua mode: pasien (kode+HP di body) ATAU admin (JWT) - Fitur 8 ---
router.put('/:id/cancel', optionalAuth, cancelRules, cancelAppointment);

// --- Khusus admin (butuh JWT) ---
router.get('/', requireAuth, getAppointments);
router.get('/:id', requireAuth, getAppointmentById);
router.put('/:id', requireAuth, updateStatusRules, updateAppointmentStatus);
router.delete('/:id', requireAuth, deleteAppointment);

module.exports = router;
