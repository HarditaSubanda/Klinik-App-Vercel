-- =========================================================
-- Skema Database PostgreSQL - Sistem Informasi Klinik
-- =========================================================

CREATE TABLE IF NOT EXISTS admins (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,      -- hash bcrypt, TIDAK PERNAH plaintext
    nama_lengkap  VARCHAR(100),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id           SERIAL PRIMARY KEY,
    nama_pasien  VARCHAR(100) NOT NULL,
    nik          VARCHAR(16)  NOT NULL,
    no_hp        VARCHAR(20)  NOT NULL,
    poli         VARCHAR(20)  NOT NULL CHECK (poli IN ('Umum', 'Gigi', 'Anak')),
    dokter       VARCHAR(100) NOT NULL,
    tanggal      DATE         NOT NULL,
    jam          VARCHAR(20)  NOT NULL,
    keluhan      TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'Menunggu'
                 CHECK (status IN ('Menunggu', 'Dikonfirmasi', 'Selesai', 'Dibatalkan')),
    dibuat_pada  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Mencegah dua janji temu yang sudah DIKONFIRMASI bentrok di dokter/tanggal/jam
-- yang sama (dijaga di level database, bukan hanya di kode aplikasi, untuk
-- menghindari race condition ketika dua request datang bersamaan).
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_slot
    ON appointments (dokter, tanggal, jam)
    WHERE status = 'Dikonfirmasi';

-- Index untuk mempercepat pencarian/pengecekan jadwal & filter dashboard admin
CREATE INDEX IF NOT EXISTS idx_appointments_dokter_tanggal_jam
    ON appointments (dokter, tanggal, jam);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments (status);

CREATE INDEX IF NOT EXISTS idx_appointments_tanggal
    ON appointments (tanggal DESC);

-- =========================================================
-- v3 - Pendaftaran, Antrean, Jadwal Dokter
-- (ditambahkan di atas skema v2 di atas - tabel/kolom lama TIDAK diubah/dihapus)
-- =========================================================

-- --- Dokter (dulunya daftar statis DOKTER_LIST di constants.js) ---
CREATE TABLE IF NOT EXISTS doctors (
    id          SERIAL PRIMARY KEY,
    nama        VARCHAR(100) UNIQUE NOT NULL,
    poli        VARCHAR(20)  NOT NULL CHECK (poli IN ('Umum', 'Gigi', 'Anak')),
    status      VARCHAR(20)  NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- --- Jadwal praktik dokter: hari + slot jam (dari JAM_SLOTS yang sama dengan form booking) ---
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id          SERIAL PRIMARY KEY,
    doctor_id   INTEGER      NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    hari        VARCHAR(10)  NOT NULL CHECK (hari IN
                 ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    jam         VARCHAR(20)  NOT NULL, -- harus salah satu dari JAM_SLOTS (divalidasi di kode aplikasi)
    status      VARCHAR(20)  NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (doctor_id, hari, jam)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor
    ON doctor_schedules (doctor_id);

-- --- Kolom baru pada appointments (semua nullable / punya default agar baris lama tetap valid) ---
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS kode_pendaftaran VARCHAR(20) UNIQUE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id        INTEGER REFERENCES doctors(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS nomor_antrean    INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS queue_status     VARCHAR(20)
    CHECK (queue_status IN ('Menunggu', 'Dipanggil'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Mempercepat pencarian kode pendaftaran per tanggal (untuk generate nomor urut kode)
CREATE INDEX IF NOT EXISTS idx_appointments_kode_pendaftaran
    ON appointments (kode_pendaftaran);

-- Mempercepat query "Cek Pendaftaran" (kode + no HP) & "Riwayat" (no HP)
CREATE INDEX IF NOT EXISTS idx_appointments_no_hp
    ON appointments (no_hp);

-- =========================================================
-- v4 - Nomor antrean terpisah per poli (mis. Poli Umum -> A-001,
-- Poli Gigi -> B-001, Poli Anak -> C-001, masing-masing mulai dari 1 lagi
-- per tanggal). Ganti index unik lama (tanggal, nomor_antrean) yang dulu
-- membuat nomor antrean berbagi satu seri untuk SEMUA poli, jadi
-- (tanggal, poli, nomor_antrean) supaya tiap poli boleh punya nomor yang
-- sama persis (nomor mentahnya) di tanggal yang sama.
-- =========================================================
DROP INDEX IF EXISTS idx_unique_antrean_per_tanggal;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_antrean_per_tanggal_poli
    ON appointments (tanggal, poli, nomor_antrean)
    WHERE nomor_antrean IS NOT NULL;
