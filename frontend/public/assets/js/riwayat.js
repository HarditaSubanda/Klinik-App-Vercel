document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('riwayat-form');
    const btn = document.getElementById('riwayat-btn');
    const listEl = document.getElementById('riwayat-list');

    const STATUS_COLORS = {
        Menunggu: 'bg-yellow-100 text-yellow-800',
        Dikonfirmasi: 'bg-blue-100 text-blue-800',
        Selesai: 'bg-green-100 text-green-800',
        Dibatalkan: 'bg-red-100 text-red-800'
    };

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function formatTanggal(iso) {
        const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function renderItem(item) {
        const warna = STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800';
        const nomorAntrean = item.nomor_antrean_display || '-';
        return `
        <div class="border rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
                <span class="font-mono font-bold text-sm">${escapeHtml(item.kode_pendaftaran || '-')}</span>
                <span class="${warna} text-xs font-bold px-2 py-1 rounded">${escapeHtml(item.status)}</span>
            </div>
            <div class="text-sm text-gray-700">${escapeHtml(formatTanggal(item.tanggal))} &bull; ${escapeHtml(item.jam)}</div>
            <div class="text-sm text-gray-500">${escapeHtml(item.dokter)} (Poli ${escapeHtml(item.poli)})</div>
            <div class="text-xs text-gray-400 mt-1">Nomor antrean: ${nomorAntrean}</div>
        </div>`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.textContent = 'Mencari...';
        listEl.innerHTML = '<p class="text-center text-gray-500 py-4">Memuat data...</p>';

        const noHp = new FormData(form).get('noHp').trim();

        try {
            const res = await Api.getHistory(noHp);
            if (res.appointments.length === 0) {
                listEl.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada riwayat pendaftaran.</p>';
            } else {
                listEl.innerHTML = res.appointments.map(renderItem).join('');
            }
        } catch (err) {
            listEl.innerHTML = `<p class="text-center text-red-600 py-4">${escapeHtml(err.message || 'Gagal memuat riwayat.')}</p>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Cari';
        }
    });
});
