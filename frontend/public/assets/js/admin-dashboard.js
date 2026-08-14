document.addEventListener('DOMContentLoaded', () => {
    window.renderAdminSubnav('dashboard');

    const errorBanner = document.getElementById('error-banner');
    const adminNameEl = document.getElementById('admin-name');

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function formatTanggal(iso) {
        const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function renderTerbaru(items) {
        if (items.length === 0) return '<p class="text-gray-400 text-center py-4">Belum ada pendaftaran.</p>';
        return items.map((it) => `
            <div class="flex justify-between border-b pb-2 last:border-b-0">
                <div>
                    <div class="font-medium">${escapeHtml(it.nama_pasien)}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(it.dokter)} &bull; ${formatTanggal(it.tanggal)}</div>
                </div>
                <span class="text-xs font-bold self-center">${escapeHtml(it.status)}</span>
            </div>`).join('');
    }

    function renderAntrean(items) {
        if (items.length === 0) return '<p class="text-gray-400 text-center py-4">Tidak ada antrean aktif.</p>';
        return items.map((it) => `
            <div class="flex justify-between border-b pb-2 last:border-b-0">
                <div>
                    <div class="font-mono font-bold">${it.nomor_antrean_display || '-'}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(it.nama_pasien)} &bull; Poli ${escapeHtml(it.poli)} &bull; ${escapeHtml(it.dokter)}</div>
                </div>
                <span class="text-xs font-bold self-center ${it.queue_status === 'Dipanggil' ? 'text-blue-600' : 'text-yellow-600'}">
                    ${it.queue_status === 'Dipanggil' ? 'Sedang Dilayani' : 'Menunggu'}
                </span>
            </div>`).join('');
    }

    function renderMenunggu(items) {
        if (items.length === 0) return '<p class="text-gray-400 text-center py-4">Tidak ada yang menunggu konfirmasi.</p>';
        return items.map((it) => `
            <div class="flex justify-between border-b pb-2 last:border-b-0">
                <div>
                    <div class="font-medium">${escapeHtml(it.nama_pasien)}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(it.dokter)} &bull; ${formatTanggal(it.tanggal)} ${escapeHtml(it.jam)}</div>
                </div>
                <span class="font-mono text-xs self-center">${escapeHtml(it.kode_pendaftaran || '-')}</span>
            </div>`).join('');
    }

    async function loadStats() {
        try {
            const res = await Api.getDashboardStats();
            document.getElementById('stat-total').textContent = res.stats.totalPendaftaranHariIni;
            document.getElementById('stat-menunggu').textContent = res.stats.menungguKonfirmasi;
            document.getElementById('stat-dikonfirmasi').textContent = res.stats.dikonfirmasi;
            document.getElementById('stat-sedang-dilayani').textContent = res.stats.sedangDilayani;
            document.getElementById('stat-selesai').textContent = res.stats.selesai;
            document.getElementById('stat-dibatalkan').textContent = res.stats.dibatalkan;

            document.getElementById('list-terbaru').innerHTML = renderTerbaru(res.appointmentTerbaru);
            document.getElementById('list-antrean').innerHTML = renderAntrean(res.antreanAktif);
            document.getElementById('list-menunggu').innerHTML = renderMenunggu(res.menungguKonfirmasi);
        } catch (err) {
            errorBanner.textContent = err.message || 'Gagal memuat statistik dashboard.';
            errorBanner.classList.remove('hidden');
        }
    }

    async function loadAdminName() {
        try {
            const res = await Api.me();
            adminNameEl.textContent = res.admin.nama_lengkap || res.admin.username;
        } catch (err) {
            adminNameEl.textContent = 'Admin';
        }
    }

    loadAdminName();
    loadStats();
});
