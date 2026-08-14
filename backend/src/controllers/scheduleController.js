const { validationResult } = require('express-validator');
const scheduleModel = require('../models/scheduleModel');
const doctorModel = require('../models/doctorModel');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/doctors/:id/schedules (publik: hanya aktif | admin: semua)
const listSchedules = asyncHandler(async (req, res) => {
    const doctor = await doctorModel.findById(req.params.id);
    if (!doctor) {
        return res.status(404).json({ success: false, message: 'Dokter tidak ditemukan.' });
    }
    const schedules = await scheduleModel.findByDoctor(doctor.id, { activeOnly: !req.admin });
    res.json({ success: true, doctor, schedules });
});

// POST /api/doctors/:id/schedules (admin)
const createSchedule = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const doctor = await doctorModel.findById(req.params.id);
    if (!doctor) {
        return res.status(404).json({ success: false, message: 'Dokter tidak ditemukan.' });
    }

    const schedule = await scheduleModel.create({
        doctorId: doctor.id,
        hari: req.body.hari,
        jam: req.body.jam
    });
    res.status(201).json({ success: true, message: 'Jadwal berhasil ditambahkan.', schedule });
});

// PUT /api/schedules/:id (admin)
const updateSchedule = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const schedule = await scheduleModel.update(req.params.id, {
        hari: req.body.hari,
        jam: req.body.jam,
        status: req.body.status
    });
    if (!schedule) {
        return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Jadwal berhasil diperbarui.', schedule });
});

// DELETE /api/schedules/:id (admin)
const deleteSchedule = asyncHandler(async (req, res) => {
    const deleted = await scheduleModel.remove(req.params.id);
    if (!deleted) {
        return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
});

module.exports = { listSchedules, createSchedule, updateSchedule, deleteSchedule };
