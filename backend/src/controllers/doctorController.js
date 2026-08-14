const { validationResult } = require('express-validator');
const doctorModel = require('../models/doctorModel');
const scheduleModel = require('../models/scheduleModel');
const appointmentModel = require('../models/appointmentModel');
const asyncHandler = require('../utils/asyncHandler');
const { getHariFromTanggal, isPastDate } = require('../utils/dateHelpers');
const { JAM_SLOTS } = require('../utils/constants');

// GET /api/doctors (publik: hanya aktif | admin dengan token: semua)
const listDoctors = asyncHandler(async (req, res) => {
    const doctors = req.admin ? await doctorModel.findAll() : await doctorModel.findAllActive();
    res.json({ success: true, doctors });
});

// GET /api/doctors/:id
const getDoctor = asyncHandler(async (req, res) => {
    const doctor = await doctorModel.findById(req.params.id);
    if (!doctor) {
        return res.status(404).json({ success: false, message: 'Dokter tidak ditemukan.' });
    }
    res.json({ success: true, doctor });
});

// POST /api/doctors (admin)
const createDoctor = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const existing = await doctorModel.findByName(req.body.nama.trim());
    if (existing) {
        return res.status(409).json({ success: false, message: 'Sudah ada dokter dengan nama tersebut.' });
    }

    const doctor = await doctorModel.create({ nama: req.body.nama.trim(), poli: req.body.poli });
    res.status(201).json({ success: true, message: 'Dokter berhasil ditambahkan.', doctor });
});

// PUT /api/doctors/:id (admin)
const updateDoctor = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const doctor = await doctorModel.update(req.params.id, {
        nama: req.body.nama.trim(),
        poli: req.body.poli,
        status: req.body.status
    });
    if (!doctor) {
        return res.status(404).json({ success: false, message: 'Dokter tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data dokter berhasil diperbarui.', doctor });
});

// DELETE /api/doctors/:id (admin) - soft delete (nonaktifkan), lihat doctorModel.deactivate
const deactivateDoctor = asyncHandler(async (req, res) => {
    const doctor = await doctorModel.deactivate(req.params.id);
    if (!doctor) {
        return res.status(404).json({ success: false, message: 'Dokter tidak ditemukan.' });
    }
    res.json({
        success: true,
        message: 'Dokter berhasil dinonaktifkan. Riwayat appointment dokter ini tetap tersimpan.',
        doctor
    });
});

// GET /api/doctors/:id/available-slots?tanggal=YYYY-MM-DD (publik)
// Dipakai form booking: menampilkan hanya jam yang (a) memang jadwal dokter
// pada hari itu, dan (b) belum dikonfirmasi pasien lain (Fitur 5 & 6).
const getAvailableSlots = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const doctor = await doctorModel.findById(req.params.id);
    if (!doctor || doctor.status !== 'Aktif') {
        return res.status(404).json({ success: false, message: 'Dokter tidak ditemukan atau tidak aktif.' });
    }

    const { tanggal } = req.query;
    if (isPastDate(tanggal)) {
        return res.json({ success: true, hari: null, slots: [] });
    }

    const hari = getHariFromTanggal(tanggal);
    const jadwalHariItu = await scheduleModel.findByDoctor(doctor.id, { activeOnly: true });
    const jamTersedia = jadwalHariItu.filter((j) => j.hari === hari).map((j) => j.jam);

    const slots = [];
    for (const jam of JAM_SLOTS) {
        if (!jamTersedia.includes(jam)) continue;
        const konflik = await appointmentModel.findConfirmedConflict({ dokter: doctor.nama, tanggal, jam });
        slots.push({ jam, tersedia: !konflik });
    }

    res.json({ success: true, hari, slots });
});

module.exports = {
    listDoctors,
    getDoctor,
    createDoctor,
    updateDoctor,
    deactivateDoctor,
    getAvailableSlots
};
