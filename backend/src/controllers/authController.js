const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const adminModel = require('../models/adminModel');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    const admin = await adminModel.findByUsername(username);

    // Pesan error generik & waktu respons yang konsisten (lihat bcrypt.compare
    // di bawah tetap dijalankan bahkan jika admin tidak ditemukan) supaya
    // penyerang tidak bisa menebak username mana yang valid (mitigasi
    // username enumeration / timing attack sederhana).
    const passwordHash = admin ? admin.password_hash : '$2a$10$invalidsaltinvalidsaltinvalidsalO';
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!admin || !isValid) {
        return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const token = jwt.sign(
        { sub: admin.id, username: admin.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );

    res.json({
        success: true,
        message: 'Login berhasil',
        token,
        admin: { id: admin.id, username: admin.username, namaLengkap: admin.nama_lengkap }
    });
});

const me = asyncHandler(async (req, res) => {
    const admin = await adminModel.findById(req.admin.id);
    if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin tidak ditemukan.' });
    }
    res.json({ success: true, admin });
});

module.exports = { login, me };
