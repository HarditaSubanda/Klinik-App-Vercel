document.addEventListener('DOMContentLoaded', () => {
    window.renderAdminSubnav('dokter');

    const doctorListEl = document.getElementById('doctor-list');
    const errorBanner = document.getElementById('error-banner');
    const successBanner = document.getElementById('success-banner');
    const adminNameEl = document.getElementById('admin-name');
    const addForm = document.getElementById('add-doctor-form');

    // Sengaja di-hardcode sama persis dengan HARI_LIST & JAM_SLOTS di
    // backend/src/utils/constants.js (tidak ada endpoint khusus untuk
    // mengambil daftar ini karena keduanya whitelist tetap, bukan data yang
    // dikelola admin - lihat DOKUMENTASI_TEKNIS.md).
    const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const JAM_SLOTS = ['08:00 - 10:00', '10:00 - 12:00', '13:00 - 15:00'];

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function showError(msg) {
        errorBanner.textContent = msg;
        errorBanner.classList.remove('hidden');
        successBanner.classList.add('hidden');
    }
    function showSuccess(msg) {
        successBanner.textContent = msg;
        successBanner.classList.remove('hidden');
        errorBanner.classList.add('hidden');
    }

    function scheduleKey(hari, jam) { return `${hari}|${jam}`; }

    function renderDoctorCard(doctor, scheduleMap) {
        const statusBadge = doctor.status === 'Aktif'
            ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Aktif</span>'
            : '<span class="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded">Nonaktif</span>';

        const grid = HARI_LIST.map((hari) => `
            <div class="flex flex-wrap items-center gap-2 py-1.5 border-b last:border-b-0">
                <span class="w-20 text-sm font-medium text-gray-700">${escapeHtml(hari)}</span>
                <div class="flex flex-wrap gap-3">
                    ${JAM_SLOTS.map((jam) => {
                        const key = scheduleKey(hari, jam);
                        const checked = scheduleMap.has(key);
                        return `
                        <label class="flex items-center gap-1.5 text-xs cursor-pointer select-none bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded">
                            <input type="checkbox" class="schedule-checkbox" data-doctor-id="${doctor.id}"
                                data-hari="${escapeHtml(hari)}" data-jam="${escapeHtml(jam)}"
                                ${checked ? `checked data-schedule-id="${scheduleMap.get(key)}"` : ''}>
                            ${escapeHtml(jam)}
                        </label>`;
                    }).join('')}
                </div>
            </div>
        `).join('');

        return `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden" data-doctor-card="${doctor.id}">
            <div class="p-5 border-b flex flex-wrap justify-between items-center gap-3">
                <div>
                    <span class="font-bold text-lg">${escapeHtml(doctor.nama)}</span>
                    <span class="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded ml-2">Poli ${escapeHtml(doctor.poli)}</span>
                    ${statusBadge}
                </div>
                <div class="flex gap-2">
                    <button class="edit-btn text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold" data-id="${doctor.id}">Edit</button>
                    <button class="toggle-status-btn text-sm ${doctor.status === 'Aktif' ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-green-100 hover:bg-green-200 text-green-700'} px-3 py-1.5 rounded font-bold"
                        data-id="${doctor.id}" data-current-status="${doctor.status}">
                        ${doctor.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                </div>
            </div>
            <div class="edit-form hidden bg-gray-50 p-4 border-b" data-edit-for="${doctor.id}">
                <form class="edit-doctor-form flex flex-wrap gap-3 items-end" data-id="${doctor.id}">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">Nama</label>
                        <input name="nama" value="${escapeHtml(doctor.nama)}" required minlength="3" maxlength="100" class="border rounded-lg px-3 py-2 text-sm w-64">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">Poli</label>
                        <select name="poli" class="border rounded-lg px-3 py-2 text-sm">
                            <option value="Umum" ${doctor.poli === 'Umum' ? 'selected' : ''}>Umum</option>
                            <option value="Gigi" ${doctor.poli === 'Gigi' ? 'selected' : ''}>Gigi</option>
                            <option value="Anak" ${doctor.poli === 'Anak' ? 'selected' : ''}>Anak</option>
                        </select>
                    </div>
                    <input type="hidden" name="status" value="${doctor.status}">
                    <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg">Simpan</button>
                </form>
            </div>
            <div class="p-5">
                <p class="text-xs font-bold text-gray-500 mb-2">JADWAL PRAKTIK (centang untuk mengaktifkan slot)</p>
                ${grid}
            </div>
        </div>`;
    }

    async function loadDoctors() {
        errorBanner.classList.add('hidden');
        try {
            const doctorRes = await Api.getDoctors();
            if (doctorRes.doctors.length === 0) {
                doctorListEl.innerHTML = '<p class="text-center text-gray-500 py-8">Belum ada data dokter. Tambahkan lewat form di atas.</p>';
                return;
            }

            const cards = await Promise.all(doctorRes.doctors.map(async (doctor) => {
                const scheduleMap = new Map();
                try {
                    const scheduleRes = await Api.getSchedules(doctor.id);
                    scheduleRes.schedules
                        .filter((s) => s.status === 'Aktif')
                        .forEach((s) => scheduleMap.set(scheduleKey(s.hari, s.jam), s.id));
                } catch (err) {
                    // Biarkan grid kosong kalau gagal memuat jadwal dokter ini
                }
                return renderDoctorCard(doctor, scheduleMap);
            }));

            doctorListEl.innerHTML = cards.join('');
        } catch (err) {
            doctorListEl.innerHTML = '';
            showError(err.message || 'Gagal memuat data dokter.');
        }
    }

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(addForm).entries());
        try {
            await Api.createDoctor(data);
            addForm.reset();
            showSuccess('Dokter berhasil ditambahkan.');
            loadDoctors();
        } catch (err) {
            showError(err.message || 'Gagal menambahkan dokter.');
        }
    });

    // Event delegation: dipasang sekali di container, tetap berfungsi
    // meskipun isi doctor-list di-render ulang lewat innerHTML.
    doctorListEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const formEl = document.querySelector(`.edit-form[data-edit-for="${id}"]`);
            if (formEl) formEl.classList.toggle('hidden');
            return;
        }

        if (e.target.classList.contains('toggle-status-btn')) {
            const id = e.target.dataset.id;
            const currentStatus = e.target.dataset.currentStatus;

            if (currentStatus === 'Aktif') {
                if (!confirm('Nonaktifkan dokter ini? Dokter tidak akan muncul lagi di form booking pasien, tapi riwayat appointment lama tetap tersimpan.')) return;
                e.target.disabled = true;
                try {
                    await Api.deactivateDoctor(id);
                    showSuccess('Dokter berhasil dinonaktifkan.');
                    loadDoctors();
                } catch (err) {
                    showError(err.message || 'Gagal menonaktifkan dokter.');
                    e.target.disabled = false;
                }
            } else {
                e.target.disabled = true;
                try {
                    const doctorRes = await Api.getDoctor(id);
                    await Api.updateDoctor(id, {
                        nama: doctorRes.doctor.nama,
                        poli: doctorRes.doctor.poli,
                        status: 'Aktif'
                    });
                    showSuccess('Dokter berhasil diaktifkan kembali.');
                    loadDoctors();
                } catch (err) {
                    showError(err.message || 'Gagal mengaktifkan dokter.');
                    e.target.disabled = false;
                }
            }
        }
    });

    doctorListEl.addEventListener('submit', async (e) => {
        if (!e.target.classList.contains('edit-doctor-form')) return;
        e.preventDefault();
        const id = e.target.dataset.id;
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            await Api.updateDoctor(id, data);
            showSuccess('Data dokter berhasil diperbarui.');
            loadDoctors();
        } catch (err) {
            showError(err.message || 'Gagal memperbarui data dokter.');
        }
    });

    // Fitur 5: centang/hilangkan centang langsung membuat/menghapus baris
    // jadwal (bukan sekadar tampilan) - lihat catatan desain di DOKUMENTASI_TEKNIS.md.
    doctorListEl.addEventListener('change', async (e) => {
        if (!e.target.classList.contains('schedule-checkbox')) return;
        const checkbox = e.target;
        const doctorId = checkbox.dataset.doctorId;
        const hari = checkbox.dataset.hari;
        const jam = checkbox.dataset.jam;
        checkbox.disabled = true;

        try {
            if (checkbox.checked) {
                const res = await Api.createSchedule(doctorId, { hari, jam });
                checkbox.dataset.scheduleId = res.schedule.id;
            } else {
                const scheduleId = checkbox.dataset.scheduleId;
                if (scheduleId) await Api.deleteSchedule(scheduleId);
            }
        } catch (err) {
            checkbox.checked = !checkbox.checked; // rollback tampilan kalau request gagal
            showError(err.message || 'Gagal memperbarui jadwal.');
        } finally {
            checkbox.disabled = false;
        }
    });

    async function loadAdminName() {
        try {
            const res = await Api.me();
            adminNameEl.textContent = res.admin.nama_lengkap || res.admin.username;
        } catch (err) {
            adminNameEl.textContent = 'Admin';
        }
    }

    loadAdminName();
    loadDoctors();
});
