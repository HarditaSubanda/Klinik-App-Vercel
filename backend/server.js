require('dotenv').config();

// Gagal cepat & jelas kalau secret penting belum diisi, daripada server
// jalan diam-diam dengan JWT_SECRET kosong/undefined (celah keamanan besar).
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('❌ JWT_SECRET belum diatur di .env atau terlalu pendek (minimal 16 karakter).');
    process.exit(1);
}
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL belum diatur di .env.');
    process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`🚀 Backend API klinik berjalan di http://localhost:${PORT}`);
});
