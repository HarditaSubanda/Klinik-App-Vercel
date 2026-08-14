const rateLimit = require('express-rate-limit');

// Batasi percobaan login untuk mencegah brute-force password admin
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.'
    }
});

// Batasi pembuatan booking dari satu IP untuk mencegah spam form pendaftaran
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 jam
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Terlalu banyak percobaan pendaftaran. Coba lagi nanti.'
    }
});

module.exports = { loginLimiter, bookingLimiter };
