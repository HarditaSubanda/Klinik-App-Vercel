/**
 * Server statis sederhana untuk frontend - HANYA untuk development lokal.
 *
 * PENTING - kenapa file ini TIDAK bernama "server.js" (atau "app.js"/"index.js"):
 * Vercel punya fitur auto-detect: kalau ada file bernama server.js/app.js/index.js
 * di root atau src/ yang memanggil .listen(), Vercel otomatis mem-build-nya
 * sebagai Vercel Function (Node.js server), BUKAN sebagai situs statis - meskipun
 * vercel.json sudah bilang outputDirectory: "public". Ini yang menyebabkan error
 * "No entrypoint found in output directory: public" saat deploy. Karena frontend
 * ini sepenuhnya statis (semua file HTML/CSS/JS sudah ada di public/, tidak perlu
 * proses Node yang berjalan), file dev server ini sengaja diberi nama lain supaya
 * TIDAK terdeteksi oleh Vercel. Di Vercel, folder public/ disajikan langsung
 * sebagai file statis lewat konfigurasi outputDirectory di vercel.json.
 *
 * Sengaja dipisah total dari backend (proses, port, dan folder berbeda) -
 * frontend hanya menyajikan file HTML/CSS/JS, semua data diambil lewat
 * fetch() ke REST API backend (lihat public/assets/js/config.js).
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.FRONTEND_PORT || 5500;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`🖥️  Frontend berjalan di http://localhost:${PORT}`);
});
