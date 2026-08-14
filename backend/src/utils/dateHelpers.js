const { HARI_LIST, CLINIC_TIMEZONE } = require('./constants');

/**
 * Ubah nilai tanggal (Date object dari pg, atau string 'YYYY-MM-DD') menjadi
 * string 'YYYY-MM-DD' murni tanpa terpengaruh timezone server.
 * node-postgres mengembalikan kolom DATE sebagai objek Date yang dibuat dari
 * string tanggal (UTC tengah malam) - kalau kita pakai getDay()/getDate() biasa
 * (versi lokal/timezone server), hasilnya bisa meleset 1 hari. Jadi semua
 * ekstraksi tanggal di sini SELALU pakai method getUTC*.
 */
function toDateOnlyString(value) {
    if (value instanceof Date) {
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, '0');
        const d = String(value.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    // String seperti '2026-08-15' atau '2026-08-15T00:00:00.000Z'
    return String(value).slice(0, 10);
}

/**
 * Ambil nama hari (Bahasa Indonesia) dari sebuah tanggal, aman dari timezone.
 */
function getHariFromTanggal(value) {
    const dateOnly = toDateOnlyString(value);
    const [y, m, d] = dateOnly.split('-').map((n) => parseInt(n, 10));
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    const jsDayIndex = utcDate.getUTCDay(); // 0 = Minggu ... 6 = Sabtu
    // HARI_LIST didefinisikan mulai dari Senin, jadi geser index-nya.
    const HARI_BY_JS_INDEX = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return HARI_BY_JS_INDEX[jsDayIndex];
}

/**
 * Tanggal hari ini (waktu server) sebagai string 'YYYY-MM-DD'.
 */
function todayISODate() {
    return toDateOnlyString(new Date());
}

/**
 * True kalau tanggal yang diberikan sudah lewat dibanding hari ini (waktu server).
 */
function isPastDate(value) {
    return toDateOnlyString(value) < todayISODate();
}

/**
 * Jam saat ini di zona waktu klinik ("HH:MM", 24 jam), TIDAK bergantung pada
 * timezone server (server produksi/serverless seringkali berjalan di UTC).
 * Dipakai untuk aturan "Panggil Berikutnya harus sesuai jam jadwal dokter"
 * (lihat models/queueModel.js).
 */
function getCurrentTimeHHMM(timeZone = CLINIC_TIMEZONE) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour').value;
    const minute = parts.find((p) => p.type === 'minute').value;
    // Beberapa environment mengembalikan "24" untuk tengah malam - normalisasi ke "00".
    const normalizedHour = hour === '24' ? '00' : hour;
    return `${normalizedHour}:${minute}`;
}

/**
 * Pecah string slot jam ("08:00 - 10:00") jadi { mulai, selesai }.
 * Mengembalikan null kalau formatnya tidak dikenali (menjaga dari data lama
 * yang mungkin tidak konsisten - dianggap "tidak ada batasan jam" oleh
 * pemanggil, bukan menyebabkan error).
 */
function parseJamSlot(jam) {
    if (!jam || typeof jam !== 'string') return null;
    const match = jam.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!match) return null;
    return { mulai: match[1], selesai: match[2] };
}

/**
 * True kalau jam sekarang (di zona waktu klinik) SUDAH memasuki jam mulai
 * dari slot jadwal yang diberikan - dasar aturan "tidak bisa memanggil
 * antrean untuk sesi jadwal yang belum dimulai" (Fitur: batasan jam lokal
 * pada "Panggil Berikutnya"). Sengaja TIDAK memeriksa batas atas (selesai)
 * supaya admin tetap bisa terus memanggil sisa antrean dalam sesi yang sama
 * walau berjalan molor dari jadwal - hanya melompat MAJU ke sesi yang belum
 * dimulai yang dicegah.
 */
function isJamSlotStarted(jam, nowHHMM = getCurrentTimeHHMM()) {
    const slot = parseJamSlot(jam);
    if (!slot) return true; // format tidak dikenali -> jangan blokir, anggap valid
    return nowHHMM >= slot.mulai;
}

module.exports = {
    toDateOnlyString,
    getHariFromTanggal,
    todayISODate,
    isPastDate,
    getCurrentTimeHHMM,
    parseJamSlot,
    isJamSlotStarted,
    HARI_LIST
};
