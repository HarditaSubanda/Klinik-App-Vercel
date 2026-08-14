const { body, query } = require('express-validator');
const { POLI_LIST, JAM_SLOTS, STATUS_LIST } = require('./constants');
const doctorModel = require('../models/doctorModel');

function isNotPastDate(value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tanggal = new Date(value);
    if (tanggal < today) {
        throw new Error('Tanggal tidak boleh di masa lalu');
    }
    return true;
}

/**
 * Dokter tidak lagi berupa whitelist statis (lihat PERUBAHAN v3) - divalidasi
 * langsung ke tabel `doctors` supaya konsisten dengan data yang dikelola
 * admin di halaman "Manajemen Dokter". Dokter yang Nonaktif dianggap tidak
 * valid untuk booking baru (tapi appointment lama miliknya tetap tersimpan).
 */
async function isActiveDoctor(value) {
    const doctor = await doctorModel.findByName(value);
    if (!doctor || doctor.status !== 'Aktif') {
        throw new Error('Dokter tidak valid atau sedang tidak aktif');
    }
    return true;
}

const createAppointmentRules = [
    body('namaPasien')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Nama lengkap harus 3-100 karakter')
        .matches(/^[a-zA-Z\s.'-]+$/).withMessage('Nama hanya boleh berisi huruf'),
    body('nik')
        .trim()
        .matches(/^\d{16}$/).withMessage('NIK harus terdiri dari 16 digit angka'),
    body('noHp')
        .trim()
        .matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/).withMessage('Format nomor HP/WA tidak valid'),
    body('poli')
        .isIn(POLI_LIST).withMessage('Poli tidak valid'),
    body('dokter')
        .trim()
        .custom(isActiveDoctor),
    body('tanggal')
        .isISO8601().withMessage('Tanggal tidak valid')
        .bail()
        .custom(isNotPastDate),
    body('jam')
        .isIn(JAM_SLOTS).withMessage('Jam periksa tidak valid'),
    body('keluhan')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 }).withMessage('Keluhan maksimal 500 karakter')
];

const updateStatusRules = [
    body('status').isIn(STATUS_LIST).withMessage('Status tidak valid')
];

const checkAvailabilityRules = [
    query('dokter').trim().custom(isActiveDoctor),
    query('tanggal').isISO8601().withMessage('Tanggal tidak valid'),
    query('jam').isIn(JAM_SLOTS).withMessage('Jam tidak valid')
];

// --- Fitur 2: Cek Pendaftaran ---
const lookupRules = [
    query('kode').trim().notEmpty().withMessage('Kode pendaftaran wajib diisi'),
    query('noHp').trim().notEmpty().withMessage('Nomor HP wajib diisi')
];

// --- Fitur 7: Riwayat Pendaftaran ---
const historyRules = [
    query('noHp').trim().notEmpty().withMessage('Nomor HP wajib diisi')
];

// --- Fitur 8: Pembatalan Appointment (oleh pasien) ---
// Kalau request datang dengan token admin yang valid (req.admin sudah diisi
// oleh middleware optionalAuth), kode & no HP tidak wajib - lihat controller.
const cancelRules = [
    body('kodePendaftaran').optional().trim(),
    body('noHp').optional().trim()
];

module.exports = {
    createAppointmentRules,
    updateStatusRules,
    checkAvailabilityRules,
    lookupRules,
    historyRules,
    cancelRules
};
