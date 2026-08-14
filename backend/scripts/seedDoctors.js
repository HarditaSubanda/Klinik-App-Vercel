/**
 * Script untuk mengisi data awal dokter + jadwal praktiknya.
 *
 * PENTING soal kompatibilitas: sebelum v3, aplikasi TIDAK punya konsep
 * jadwal dokter sama sekali - pasien bisa memilih dokter mana pun untuk hari
 * apa pun. Supaya instalasi yang sudah berjalan tidak tiba-tiba "terkunci"
 * (tidak bisa booking sama sekali) begitu fitur validasi jadwal diaktifkan,
 * script ini men-seed setiap dokter dengan jadwal AKTIF di semua 7 hari x 3
 * slot jam (persis seperti perilaku lama: selalu tersedia). Setelah itu,
 * admin bisa mempersempit jadwal sesuai jam praktik asli lewat halaman
 * "Jadwal Dokter" di dashboard.
 *
 * Aman dijalankan berkali-kali (idempotent): dokter/jadwal yang sudah ada
 * tidak akan diduplikasi.
 *
 * Jalankan dengan: npm run seed-doctors
 */
require('dotenv').config();
const pool = require('../src/config/db');
const doctorModel = require('../src/models/doctorModel');
const scheduleModel = require('../src/models/scheduleModel');
const { SEED_DOCTORS, HARI_LIST, JAM_SLOTS } = require('../src/utils/constants');

async function main() {
    console.log('=== Seed Data Dokter & Jadwal ===\n');

    for (const seed of SEED_DOCTORS) {
        let doctor = await doctorModel.findByName(seed.nama);
        if (doctor) {
            console.log(`- Dokter "${seed.nama}" sudah ada (id: ${doctor.id}), dilewati.`);
        } else {
            doctor = await doctorModel.create({ nama: seed.nama, poli: seed.poli });
            console.log(`+ Dokter "${doctor.nama}" (Poli ${doctor.poli}) berhasil dibuat (id: ${doctor.id}).`);
        }

        const jadwalSekarang = await scheduleModel.findByDoctor(doctor.id, { activeOnly: false });
        const sudahAda = new Set(jadwalSekarang.map((j) => `${j.hari}|${j.jam}`));

        let jumlahBaru = 0;
        for (const hari of HARI_LIST) {
            for (const jam of JAM_SLOTS) {
                const key = `${hari}|${jam}`;
                if (sudahAda.has(key)) continue;
                await scheduleModel.create({ doctorId: doctor.id, hari, jam });
                jumlahBaru++;
            }
        }
        console.log(`  ${jumlahBaru} slot jadwal baru ditambahkan untuk ${doctor.nama}.`);
    }

    console.log('\n✅ Selesai. Admin dapat menonaktifkan/menyesuaikan jadwal lewat halaman "Jadwal Dokter".');
    await pool.end();
}

main().catch(async (err) => {
    console.error('Gagal menjalankan seed:', err.message);
    await pool.end();
    process.exit(1);
});
