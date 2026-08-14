// Daftar nilai yang diizinkan (whitelist) untuk validasi form booking.
// Disimpan terpusat supaya frontend & backend selalu konsisten.

const POLI_LIST = ['Umum', 'Gigi', 'Anak'];

// CATATAN v3: dokter sekarang dikelola lewat tabel `doctors` (CRUD oleh admin
// di halaman "Manajemen Dokter"), bukan whitelist statis lagi. DOKTER_LIST di
// bawah ini HANYA dipakai sebagai data awal (seed) oleh db/seedDoctors.js saat
// pertama kali migrasi, supaya instalasi lama yang sudah punya data booking
// dengan 3 nama dokter ini tetap konsisten. Validasi booking yang sesungguhnya
// sekarang query ke tabel `doctors` (lihat utils/appointmentValidators.js).
const DOKTER_LIST = ['Dr. Budi Santoso', 'Dr. Siti Aminah', 'Dr. Andi Wijaya'];

// Data seed: 1 dokter mewakili 1 poli (cukup untuk skala klinik kecil di project ini).
const SEED_DOCTORS = [
    { nama: 'Dr. Budi Santoso', poli: 'Umum' },
    { nama: 'Dr. Siti Aminah', poli: 'Gigi' },
    { nama: 'Dr. Andi Wijaya', poli: 'Anak' }
];

const JAM_SLOTS = ['08:00 - 10:00', '10:00 - 12:00', '13:00 - 15:00'];

// --- v4: Nomor antrean terpisah per poli ---
// Setiap poli punya "seri" nomor antreannya sendiri (mulai dari 1 lagi setiap
// hari, per poli) dan ditampilkan dengan awalan huruf berbeda, misal
// Poli Umum -> A-001, Poli Gigi -> B-001, Poli Anak -> C-001. Urutan huruf
// mengikuti urutan POLI_LIST supaya konsisten di seluruh aplikasi.
const POLI_PREFIX = {
    Umum: 'A',
    Gigi: 'B',
    Anak: 'C'
};

// Zona waktu klinik dipakai untuk aturan "panggil berikutnya harus sesuai
// jam jadwal" (lihat utils/dateHelpers.js: getCurrentTimeHHMM). Dipakai
// secara eksplisit (bukan timezone server) supaya konsisten walaupun server
// deploy di region lain (mis. Vercel yang defaultnya UTC).
const CLINIC_TIMEZONE = 'Asia/Makassar';

const STATUS_LIST = ['Menunggu', 'Dikonfirmasi', 'Selesai', 'Dibatalkan'];

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const DOCTOR_STATUS_LIST = ['Aktif', 'Nonaktif'];

const QUEUE_STATUS_LIST = ['Menunggu', 'Dipanggil'];

// Prefix kode pendaftaran, mis. KLN-20260812-001
const KODE_PREFIX = 'KLN';

module.exports = {
    POLI_LIST,
    DOKTER_LIST,
    SEED_DOCTORS,
    JAM_SLOTS,
    POLI_PREFIX,
    CLINIC_TIMEZONE,
    STATUS_LIST,
    HARI_LIST,
    DOCTOR_STATUS_LIST,
    QUEUE_STATUS_LIST,
    KODE_PREFIX
};
