const express = require('express');
const router = express.Router();

const {
    listDoctors,
    getDoctor,
    createDoctor,
    updateDoctor,
    deactivateDoctor,
    getAvailableSlots
} = require('../controllers/doctorController');
const { listSchedules, createSchedule } = require('../controllers/scheduleController');

const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const {
    createDoctorRules,
    updateDoctorRules,
    createScheduleRules,
    availableSlotsRules
} = require('../utils/doctorValidators');

// --- Publik (pasien hanya lihat dokter/jadwal aktif) | Admin (JWT: lihat semua) ---
router.get('/', optionalAuth, listDoctors);
router.get('/:id', getDoctor);
router.get('/:id/schedules', optionalAuth, listSchedules);
router.get('/:id/available-slots', availableSlotsRules, getAvailableSlots);

// --- Khusus admin ---
router.post('/', requireAuth, createDoctorRules, createDoctor);
router.put('/:id', requireAuth, updateDoctorRules, updateDoctor);
router.delete('/:id', requireAuth, deactivateDoctor);
router.post('/:id/schedules', requireAuth, createScheduleRules, createSchedule);

module.exports = router;
