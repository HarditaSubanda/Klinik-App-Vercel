const jwt = require('jsonwebtoken');

/**
 * Melindungi route admin. Mengharapkan header:
 *   Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'Akses ditolak. Silakan login terlebih dahulu.'
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = { id: payload.sub, username: payload.username };
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Sesi login telah berakhir. Silakan login kembali.'
            : 'Token tidak valid.';
        return res.status(401).json({ success: false, message });
    }
}

/**
 * Sama seperti requireAuth, tapi TIDAK menolak request kalau token tidak ada
 * atau tidak valid - hanya mengisi req.admin kalau tokennya valid, lalu tetap
 * lanjut (next()) apa pun hasilnya. Dipakai untuk endpoint yang punya dua
 * mode: publik (pasien) DAN admin, misalnya:
 *  - GET  /api/doctors  & /api/doctors/:id/schedules (admin lihat termasuk
 *    yang nonaktif, pasien hanya lihat yang aktif)
 *  - PUT  /api/appointments/:id/cancel (pasien membatalkan appointment
 *    miliknya sendiri lewat kode+HP, ATAU admin membatalkan appointment mana
 *    pun tanpa perlu kode+HP)
 */
function optionalAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return next();
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = { id: payload.sub, username: payload.username };
    } catch (err) {
        // Token ada tapi tidak valid/kedaluwarsa - abaikan saja, perlakukan
        // seperti request publik biasa (tidak menolak request).
    }
    next();
}

module.exports = { requireAuth, optionalAuth };
