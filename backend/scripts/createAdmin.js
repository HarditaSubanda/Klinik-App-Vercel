/**
 * Script interaktif untuk membuat akun admin baru dengan password ter-hash (bcrypt).
 * Menggantikan kredensial hardcoded (admin/admin123) & file password.txt di versi lama.
 *
 * Jalankan dengan: npm run create-admin
 */
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const adminModel = require('../src/models/adminModel');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

// Menyembunyikan input password saat diketik di terminal
function askHidden(query) {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        process.stdout.write(query);
        stdin.resume();
        stdin.setRawMode(true);
        stdin.setEncoding('utf8');
        let password = '';
        const onData = (char) => {
            if (char === '\n' || char === '\r' || char === '\u0004') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(password);
            } else if (char === '\u0003') {
                process.exit(1);
            } else if (char === '\u007f') {
                password = password.slice(0, -1);
            } else {
                password += char;
            }
        };
        stdin.on('data', onData);
    });
}

async function main() {
    console.log('=== Buat Akun Admin Klinik ===\n');

    const username = (await ask('Username: ')).trim();
    if (!username) {
        console.error('Username tidak boleh kosong.');
        process.exit(1);
    }

    const existing = await adminModel.findByUsername(username);
    if (existing) {
        console.error(`Username "${username}" sudah dipakai.`);
        process.exit(1);
    }

    const namaLengkap = (await ask('Nama lengkap (opsional): ')).trim();

    let password = await askHidden('Password (minimal 8 karakter): ');
    if (password.length < 8) {
        console.error('Password minimal 8 karakter.');
        process.exit(1);
    }
    const confirm = await askHidden('Ulangi password: ');
    if (password !== confirm) {
        console.error('Password tidak cocok.');
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await adminModel.create({ username, passwordHash, namaLengkap });

    console.log(`\n✅ Admin "${admin.username}" berhasil dibuat (id: ${admin.id}).`);

    rl.close();
    await pool.end();
}

main().catch(async (err) => {
    console.error('Gagal membuat admin:', err.message);
    rl.close();
    await pool.end();
    process.exit(1);
});
