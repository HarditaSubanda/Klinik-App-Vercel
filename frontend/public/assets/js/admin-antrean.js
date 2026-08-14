document.addEventListener('DOMContentLoaded', () => {
    window.renderAdminSubnav('antrean');

    const sectionsEl = document.getElementById('poli-queue-sections');
    const tablesEl = document.getElementById('poli-queue-tables');
    const errorBanner = document.getElementById('error-banner');
    const blockedBanner = document.getElementById('blocked-banner');
    const adminNameEl = document.getElementById('admin-name');
    const tanggalInput = document.getElementById('filter-tanggal');

    const POLI_LIST = window.POLI_LIST || ['Umum', 'Gigi', 'Anak'];

    const today = new Date().toISOString().split('T')[0];
    tanggalInput.value = today;

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function poliMeta(poli) {
        return (window.POLI_META && window.POLI_META[poli]) || { label: poli, prefix: 'X', badge: 'bg-gray-100 text-gray-800 border-gray-300', solid: 'bg-gray-500', border: 'border-gray-400' };
    }

    // Render kerangka kartu per poli SEKALI saja (supaya tombol tidak
    // dibuat ulang tiap refresh - state disabled/loading dikelola terpisah).
    function renderSectionSkeletons() {
        sectionsEl.innerHTML = POLI_LIST.map((poli) => {
            const meta = poliMeta(poli);
            return `
            <div class="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 ${meta.border}">
                <div class="inline-block px-2 py-0.5 rounded-full text-xs font-bold border mb-2 ${meta.badge}">Poli ${escapeHtml(meta.label)} (${meta.prefix})</div>
                <p class="text-sm text-gray-500 mb-1">Sedang Dilayani</p>
                <p id="sedang-${poli}" class="text-4xl font-mono font-bold text-gray-800 mb-4">-</p>
                <p id="menunggu-${poli}" class="text-xs text-gray-400 mb-3">Menunggu: -</p>
                <button data-poli="${poli}" class="next-btn ${meta.solid} text-white font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 w-full">
                    Panggil Berikutnya →
                </button>
            </div>`;
        }).join('');

        tablesEl.innerHTML = POLI_LIST.map((poli) => {
            const meta = poliMeta(poli);
            return `
            <div class="mb-6">
                <h3 class="font-bold text-gray-700 mb-2">Antrean Poli ${escapeHtml(meta.label)}</h3>
                <div class="bg-white rounded-lg shadow-lg overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="${meta.solid} text-white">
                                <th class="p-3">Antrean</th>
                                <th class="p-3">Nama Pasien</th>
                                <th class="p-3">Dokter / Jam</th>
                                <th class="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-${poli}" class="divide-y divide-gray-200">
                            <tr><td colspan="4" class="p-4 text-center text-gray-500">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>`;
        }).join('');

        // Pasang event listener setelah tombol dibuat.
        document.querySelectorAll('.next-btn').forEach((btn) => {
            btn.addEventListener('click', () => handleNext(btn.dataset.poli, btn));
        });
    }

    function renderRow(item) {
        const isDipanggil = item.queue_status === 'Dipanggil';
        return `
        <tr class="${isDipanggil ? 'bg-blue-50' : ''} hover:bg-gray-50 transition">
            <td class="p-3 font-mono font-bold">${escapeHtml(item.nomor_antrean_display)}</td>
            <td class="p-3 font-bold">${escapeHtml(item.nama_pasien)}</td>
            <td class="p-3 text-sm">${escapeHtml(item.dokter)}<div class="text-xs text-gray-400">${escapeHtml(item.jam)}</div></td>
            <td class="p-3">
                <span class="px-2 py-1 rounded text-xs font-bold ${isDipanggil ? 'bg-blue-200 text-blue-800' : 'bg-yellow-200 text-yellow-800'}">
                    ${isDipanggil ? 'Sedang Dilayani' : 'Menunggu'}
                </span>
            </td>
        </tr>`;
    }

    async function loadQueue() {
        errorBanner.classList.add('hidden');

        try {
            const res = await Api.getQueueToday(tanggalInput.value);

            POLI_LIST.forEach((poli) => {
                const items = res.queue[poli] || [];
                const tbody = document.getElementById(`tbody-${poli}`);
                const sedangEl = document.getElementById(`sedang-${poli}`);
                const menungguEl = document.getElementById(`menunggu-${poli}`);

                if (!tbody) return;

                tbody.innerHTML = items.length === 0
                    ? '<tr><td colspan="4" class="p-4 text-center text-gray-500">Belum ada antrean terkonfirmasi.</td></tr>'
                    : items.map(renderRow).join('');

                const dipanggil = items.find((q) => q.queue_status === 'Dipanggil');
                const totalMenunggu = items.filter((q) => q.queue_status === 'Menunggu').length;
                sedangEl.textContent = dipanggil ? dipanggil.nomor_antrean_display : '-';
                menungguEl.textContent = `Menunggu: ${totalMenunggu} orang`;
            });
        } catch (err) {
            errorBanner.textContent = err.message || 'Gagal memuat data antrean.';
            errorBanner.classList.remove('hidden');
        }
    }

    async function handleNext(poli, btn) {
        errorBanner.classList.add('hidden');
        blockedBanner.classList.add('hidden');
        btn.disabled = true;
        btn.textContent = 'Memproses...';

        try {
            const res = await Api.callNextQueue(tanggalInput.value, poli);

            if (res.blocked) {
                // Aturan jam lokal: nomor berikutnya dijadwalkan untuk sesi
                // yang belum dimulai - tampilkan alasannya ke admin, JANGAN
                // dianggap error, cukup informasi supaya admin tahu harus
                // menunggu sampai jam sesi tsb tiba.
                blockedBanner.textContent = res.message;
                blockedBanner.classList.remove('hidden');
            } else if (res.sedangDilayani) {
                // Berhasil memanggil nomor baru - ucapkan pengumuman suara.
                window.QueueAnnouncer && window.QueueAnnouncer.announceQueue(
                    res.sedangDilayani.nomor_antrean_display,
                    res.sedangDilayani.poli
                );
            }

            await loadQueue();
        } catch (err) {
            errorBanner.textContent = err.message || 'Gagal memanggil antrean berikutnya.';
            errorBanner.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Panggil Berikutnya →';
        }
    }

    tanggalInput.addEventListener('change', loadQueue);

    async function loadAdminName() {
        try {
            const res = await Api.me();
            adminNameEl.textContent = res.admin.nama_lengkap || res.admin.username;
        } catch (err) {
            adminNameEl.textContent = 'Admin';
        }
    }

    renderSectionSkeletons();
    loadAdminName();
    loadQueue();
});
