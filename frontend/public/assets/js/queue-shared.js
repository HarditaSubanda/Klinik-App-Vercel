/**
 * Konstanta & util bersama untuk fitur "nomor antrean terpisah per poli"
 * (dipakai beranda, halaman "Nomor Antrean" pasien, & admin "Manajemen
 * Antrean"). Awalan huruf (prefix) HARUS sama persis dengan POLI_PREFIX di
 * backend/src/utils/constants.js - kalau ubah salah satu, ubah juga yang
 * lain. Backend sebenarnya sudah mengirim nomor_antrean_display jadi
 * (siap pakai), jadi formatNomorAntrean di sini cuma dipakai sebagai
 * fallback kalau field tsb entah kenapa belum ada.
 */
window.POLI_LIST = ['Umum', 'Gigi', 'Anak'];

window.POLI_META = {
    Umum: { label: 'Umum', prefix: 'A', badge: 'bg-red-100 text-red-800 border-red-300', solid: 'bg-red-600', border: 'border-red-500' },
    Gigi: { label: 'Gigi', prefix: 'B', badge: 'bg-blue-100 text-blue-800 border-blue-300', solid: 'bg-blue-600', border: 'border-blue-500' },
    Anak: { label: 'Ibu & Anak', prefix: 'C', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', solid: 'bg-emerald-600', border: 'border-emerald-500' }
};

window.formatNomorAntrean = function (poli, nomor) {
    if (!nomor) return '-';
    const meta = window.POLI_META[poli];
    const prefix = meta ? meta.prefix : 'X';
    return `${prefix}-${String(nomor).padStart(3, '0')}`;
};
