# Sistem Informasi Klinik Talha — v3 (Pendaftaran, Antrean & Jadwal Dokter)

Versi ini adalah hasil modifikasi menyeluruh dari project awal (Express + EJS + Supabase),
dipecah menjadi dua project independen:

```
klinik-app/
├── backend/    -> REST API (Express + PostgreSQL + JWT + bcrypt)
└── frontend/   -> Halaman statis (HTML + Tailwind + JS) yang memanggil API lewat fetch()
```

Backend dan frontend berjalan sebagai **dua proses terpisah di port yang berbeda**
(backend `:4000`, frontend `:5500`) dan berkomunikasi lewat HTTP/JSON (REST API),
diamankan dengan CORS. Ini memudahkan keduanya di-deploy terpisah, dikembangkan
terpisah, atau bahkan diganti salah satunya di masa depan (misalnya frontend diganti
jadi aplikasi mobile) tanpa menyentuh yang lain.

Lihat `PERUBAHAN.md` untuk daftar lengkap apa yang diubah/diperbaiki dari versi awal,
dan **`DOKUMENTASI_TEKNIS.md` untuk penjelasan lengkap teknologi, arsitektur, skema
database, serta cara kerja setiap fitur** (cocok dipakai sebagai bahan sidang).

---

## 1. Persiapan Database (PostgreSQL)

1. Install PostgreSQL (jika belum ada) dan pastikan service-nya berjalan.
2. Buat database baru, contoh lewat `psql`:
   ```sql
   CREATE DATABASE klinik_db;
   ```
3. Kamu bisa pakai PostgreSQL lokal, atau layanan cloud gratis seperti
   [Neon](https://neon.tech), [Railway](https://railway.app), atau
   [Supabase](https://supabase.com) (Supabase juga berbasis PostgreSQL murni,
   jadi tinggal ambil "Connection string" mode-nya, bukan REST API-nya lagi).

## 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Buka file `.env` dan isi:
- `DATABASE_URL` — connection string PostgreSQL kamu
- `JWT_SECRET` — string acak & rahasia (generate dengan perintah di bawah)
- `FRONTEND_URL` — biarkan `http://localhost:5500` untuk pengembangan lokal

Generate `JWT_SECRET` yang aman:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Jalankan migrasi untuk membuat/memperbarui tabel:
```bash
npm run migrate
```

Buat akun admin pertama (password akan di-hash pakai bcrypt, tidak pernah disimpan
sebagai teks biasa):
```bash
npm run create-admin
```

Isi data awal dokter + jadwal praktik (supaya form booking pasien tidak kosong):
```bash
npm run seed-doctors
```

Jalankan server backend:
```bash
npm start
```
Backend akan berjalan di `http://localhost:4000`. Cek dengan membuka
`http://localhost:4000/api/health` di browser.

## 3. Setup Frontend

Di terminal baru:
```bash
cd frontend
npm install
npm start
```
Frontend akan berjalan di `http://localhost:5500`. Buka alamat ini di browser.

> Jika backend dijalankan di alamat/port lain (misalnya saat deploy), ubah
> `frontend/public/assets/js/config.js` (`API_BASE_URL`).

## 4. Alur Pemakaian

- **Pasien**: buka halaman utama → "Buat Janji" → pilih poli & dokter (jadwal
  ditampilkan otomatis sesuai hari yang tersedia) → isi formulir → dapat kode
  pendaftaran + bukti cetak. Bisa juga membuka "Jadwal Dokter", "Cek
  Pendaftaran", "Riwayat", atau "Antrean" kapan saja lewat kode pendaftaran +
  nomor HP yang dipakai saat mendaftar.
- **Admin**: klik "Login Staff" → login dengan akun yang dibuat lewat
  `npm run create-admin` → masuk ke **Dashboard** (statistik hari ini) →
  navigasi ke **Appointment** (kelola/filter/cari & ubah status),
  **Antrean** (panggil antrean berikutnya), atau **Dokter & Jadwal**
  (kelola data dokter dan jadwal praktiknya).

---

## Struktur Backend

```
backend/
├── server.js                   # entry point
├── db/schema.sql                # skema tabel PostgreSQL
├── db/migrate.js                # jalankan schema.sql ke database
├── scripts/createAdmin.js       # buat akun admin (password di-hash bcrypt)
├── scripts/seedDoctors.js       # isi data awal dokter + jadwal praktik
└── src/
    ├── app.js                   # konfigurasi Express + middleware keamanan
    ├── config/db.js              # koneksi PostgreSQL (pg Pool)
    ├── controllers/              # logika request/response
    ├── middleware/                # auth JWT, error handler, rate limiter
    ├── models/                   # query SQL (parameterized, anti SQL-injection)
    ├── routes/                   # definisi endpoint REST API
    └── utils/                    # validasi input, konstanta, helper
```

### Endpoint API

Daftar lengkap (termasuk endpoint dokter, jadwal, antrean, dan dashboard yang
baru) ada di **`DOKUMENTASI_TEKNIS.md` §7**. Ringkasan endpoint inti:

| Method | Endpoint                              | Akses   | Keterangan                          |
|--------|----------------------------------------|---------|--------------------------------------|
| GET    | `/api/health`                          | Publik  | Cek status server                    |
| POST   | `/api/auth/login`                      | Publik  | Login admin, mengembalikan JWT       |
| GET    | `/api/auth/me`                         | Admin   | Info admin yang sedang login         |
| POST   | `/api/appointments`                    | Publik  | Buat janji temu (booking pasien)     |
| GET    | `/api/appointments/lookup`             | Publik  | Cek status pendaftaran (kode+HP)     |
| GET    | `/api/appointments/history`            | Publik  | Riwayat pendaftaran (HP)             |
| PUT    | `/api/appointments/:id/cancel`         | Publik/Admin | Batalkan pendaftaran            |
| GET    | `/api/appointments`                    | Admin   | List + filter + paginasi             |
| PUT    | `/api/appointments/:id`                | Admin   | Update status (auto nomor antrean)   |
| GET    | `/api/doctors`, `/api/doctors/:id/schedules` | Publik/Admin | Data dokter & jadwal      |
| GET    | `/api/queue/today`, `POST /api/queue/next` | Admin | Manajemen antrean               |
| GET    | `/api/dashboard/stats`                 | Admin   | Statistik dashboard                  |

Endpoint "Admin" butuh header `Authorization: Bearer <token>` yang didapat dari
`/api/auth/login`.

## Struktur Frontend

```
frontend/
├── server.js                    # static file server sederhana
└── public/
    ├── index.html / booking.html / informasi.html / login.html
    ├── jadwal-dokter.html / cek-pendaftaran.html / riwayat.html / antrean.html
    ├── admin.html (Dashboard) / admin-appointments.html / admin-antrean.html / admin-dokter.html
    └── assets/js/
        ├── config.js              # alamat API backend
        ├── api.js                 # wrapper fetch() + penyimpanan token JWT
        ├── components/layout.js   # header, footer & sub-nav admin yang dipakai semua halaman
        ├── booking.js / login.js / jadwal-dokter.js / cek-pendaftaran.js / riwayat.js / antrean.js
        ├── admin-dashboard.js / admin-appointments.js / admin-antrean.js / admin-dokter.js
```

Token JWT disimpan di `localStorage` browser dan dikirim lewat header
`Authorization: Bearer <token>` di setiap request ke endpoint admin.

---

## Catatan Keamanan Penting

⚠️ **File `.env` (project lama maupun baru) sempat berisi kredensial Supabase asli
dan `routes/password.txt` berisi password teks biasa.** Karena file tersebut ada di
zip yang diunggah, sebaiknya kamu **rotasi/ganti kredensial Supabase itu** (buat API
key baru dari dashboard Supabase) dan **jangan gunakan lagi password di
`password.txt`** — di versi baru ini, password admin sudah diganti total dengan
sistem bcrypt + JWT lewat `npm run create-admin`, jadi file itu sudah tidak
diperlukan lagi.

Jangan pernah commit file `.env` ke Git/GitHub (sudah diamankan lewat `.gitignore`).
