const { validationResult } = require('express-validator');
const appointmentModel = require('../models/appointmentModel');
const doctorModel = require('../models/doctorModel');
const scheduleModel = require('../models/scheduleModel');
const asyncHandler = require('../utils/asyncHandler');
const { getHariFromTanggal } = require('../utils/dateHelpers');

// POST /api/appointments  (publik - dipakai form booking pasien)
const createAppointment = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array()
        });
    }

    const { namaPasien, nik, noHp, poli, dokter, tanggal, jam, keluhan } = req.body;

    // Dokter sudah dipastikan ada & Aktif oleh validator (isActiveDoctor),
    // tapi kita perlu datanya lagi di sini untuk validasi poli & jadwal.
    const doctor = await doctorModel.findByName(dokter);
    if (!doctor) {
        return res.status(400).json({ success: false, message: 'Dokter tidak valid.' });
    }
    if (doctor.poli !== poli) {
        return res.status(400).json({
            success: false,
            message: `${dokter} bertugas di Poli ${doctor.poli}, bukan Poli ${poli}. Silakan sesuaikan pilihan poli.`
        });
    }

    // Fitur 6: appointment tidak boleh di luar jadwal praktik dokter.
    const hari = getHariFromTanggal(tanggal);
    const jadwalValid = await scheduleModel.findActiveSlot({ doctorId: doctor.id, hari, jam });
    if (!jadwalValid) {
        return res.status(409).json({
            success: false,
            message: `${dokter} tidak praktik pada hari ${hari} jam ${jam}. Silakan pilih jadwal lain.`
        });
    }

    // Fitur 6: slot yang sudah dikonfirmasi pasien lain tidak boleh dipakai lagi.
    const konflik = await appointmentModel.findConfirmedConflict({ dokter, tanggal, jam });
    if (konflik) {
        return res.status(409).json({
            success: false,
            message: `Jadwal pada tanggal ${tanggal} jam ${jam} untuk ${dokter} sudah penuh (telah dikonfirmasi). Silakan pilih tanggal atau jam yang lain.`
        });
    }

    const appointment = await appointmentModel.create({
        namaPasien, nik, noHp, poli, dokter, doctorId: doctor.id, tanggal, jam, keluhan
    });

    res.status(201).json({
        success: true,
        message: 'Pendaftaran berhasil dibuat. Simpan kode pendaftaran Anda untuk mengecek status.',
        appointment
    });
});

// GET /api/appointments/check-availability (publik - dipakai frontend sebelum submit)
const checkAvailability = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { dokter, tanggal, jam } = req.query;

    const doctor = await doctorModel.findByName(dokter);
    const hari = getHariFromTanggal(tanggal);
    const jadwalValid = doctor
        ? await scheduleModel.findActiveSlot({ doctorId: doctor.id, hari, jam })
        : null;

    const konflik = await appointmentModel.findConfirmedConflict({ dokter, tanggal, jam });

    res.json({
        success: true,
        tersedia: Boolean(jadwalValid) && !konflik,
        sesuaiJadwalDokter: Boolean(jadwalValid)
    });
});

// GET /api/appointments/lookup?kode=&noHp=  (publik - Fitur 2: Cek Pendaftaran)
const lookupAppointment = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { kode, noHp } = req.query;
    const appointment = await appointmentModel.findByKodeAndNoHp(kode.toUpperCase(), noHp);
    if (!appointment) {
        return res.status(404).json({ success: false, message: 'Data pendaftaran tidak ditemukan.' });
    }
    res.json({ success: true, appointment });
});

// GET /api/appointments/history?noHp=  (publik - Fitur 7: Riwayat Pendaftaran)
const getHistory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const appointments = await appointmentModel.findHistoryByNoHp(req.query.noHp);
    res.json({ success: true, appointments });
});

// PUT /api/appointments/:id/cancel  (Fitur 8 - dua mode lewat optionalAuth)
const cancelAppointment = asyncHandler(async (req, res) => {
    if (!req.admin) {
        // Mode pasien: wajib membuktikan kepemilikan lewat kode + no HP yang sama
        // persis dengan data appointment-nya.
        const { kodePendaftaran, noHp } = req.body;
        if (!kodePendaftaran || !noHp) {
            return res.status(400).json({
                success: false,
                message: 'Kode pendaftaran dan nomor HP wajib diisi untuk membatalkan pendaftaran.'
            });
        }
        const appointment = await appointmentModel.findById(req.params.id);
        if (!appointment || appointment.kode_pendaftaran !== kodePendaftaran.toUpperCase() || appointment.no_hp !== noHp) {
            return res.status(404).json({ success: false, message: 'Data pendaftaran tidak ditemukan.' });
        }
    }

    const result = await appointmentModel.cancel(req.params.id);
    if (!result.ok) {
        if (result.reason === 'not_found') {
            return res.status(404).json({ success: false, message: 'Janji temu tidak ditemukan.' });
        }
        return res.status(409).json({
            success: false,
            message: 'Pendaftaran ini sudah Selesai atau sudah Dibatalkan sebelumnya, tidak bisa dibatalkan lagi.'
        });
    }

    res.json({ success: true, message: 'Pendaftaran berhasil dibatalkan.', appointment: result.appointment });
});

// GET /api/appointments  (khusus admin - list + filter + paginasi)
const getAppointments = asyncHandler(async (req, res) => {
    const { status, poli, search, tanggal, page, limit } = req.query;
    const result = await appointmentModel.findAll({ status, poli, search, tanggal, page, limit });
    res.json({ success: true, ...result });
});

// GET /api/appointments/:id (khusus admin)
const getAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await appointmentModel.findById(req.params.id);
    if (!appointment) {
        return res.status(404).json({ success: false, message: 'Janji temu tidak ditemukan.' });
    }
    res.json({ success: true, appointment });
});

// PUT /api/appointments/:id (khusus admin - update status; auto-assign nomor
// antrean saat dikonfirmasi, lihat appointmentModel.updateStatus)
const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const updated = await appointmentModel.updateStatus(req.params.id, req.body.status);
    if (!updated) {
        return res.status(404).json({ success: false, message: 'Janji temu tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Status berhasil diperbarui.', appointment: updated });
});

// DELETE /api/appointments/:id (khusus admin)
const deleteAppointment = asyncHandler(async (req, res) => {
    const deleted = await appointmentModel.remove(req.params.id);
    if (!deleted) {
        return res.status(404).json({ success: false, message: 'Janji temu tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data janji temu berhasil dihapus.' });
});

module.exports = {
    createAppointment,
    checkAvailability,
    lookupAppointment,
    getHistory,
    cancelAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    deleteAppointment
};
