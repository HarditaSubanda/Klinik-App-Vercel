const { POLI_PREFIX } = require('./constants');

/**
 * Format nomor antrean mentah (integer, unik per tanggal+poli) jadi kode
 * tampilan per poli, mis. poli=Gigi, nomorAntrean=5 -> "B-005".
 * Mengembalikan null kalau nomorAntrean belum di-assign (appointment belum
 * dikonfirmasi), supaya pemanggil bisa menampilkan "-" secara konsisten.
 */
function formatNomorAntrean(poli, nomorAntrean) {
    if (!nomorAntrean) return null;
    const prefix = POLI_PREFIX[poli] || 'X';
    return `${prefix}-${String(nomorAntrean).padStart(3, '0')}`;
}

/**
 * Tambahkan field `nomor_antrean_display` ke satu baris appointment/antrean
 * (butuh field `poli` & `nomor_antrean` sudah ada di baris tsb). Dipakai di
 * semua tempat yang mengembalikan data antrean ke frontend supaya frontend
 * tidak perlu tahu logika awalan huruf per poli sama sekali.
 */
function withNomorAntreanDisplay(row) {
    if (!row) return row;
    return { ...row, nomor_antrean_display: formatNomorAntrean(row.poli, row.nomor_antrean) };
}

function withNomorAntreanDisplayList(rows) {
    return (rows || []).map(withNomorAntreanDisplay);
}

module.exports = { formatNomorAntrean, withNomorAntreanDisplay, withNomorAntreanDisplayList };
