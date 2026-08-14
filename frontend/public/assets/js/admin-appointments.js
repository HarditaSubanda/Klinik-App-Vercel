document.addEventListener('DOMContentLoaded', () => {
    window.renderAdminSubnav('appointments');

    const tbody = document.getElementById('appointments-tbody');
    const paginationEl = document.getElementById('pagination');
    const errorBanner = document.getElementById('error-banner');
    const adminNameEl = document.getElementById('admin-name');

    const searchInput = document.getElementById('filter-search');
    const statusSelect = document.getElementById('filter-status');
    const poliSelect = document.getElementById('filter-poli');
    const tanggalInput = document.getElementById('filter-tanggal');
    const applyBtn = document.getElementById('filter-apply');
    const resetBtn = document.getElementById('filter-reset');

    let currentPage = 1;

    const STATUS_COLORS = {
        Menunggu: 'bg-yellow-200 text-yellow-800',
        Dikonfirmasi: 'bg-blue-200 text-blue-800',
        Selesai: 'bg-green-200 text-green-800',
        Dibatalkan: 'bg-red-200 text-red-800'
    };

    // Mencegah XSS: semua data pasien (nama, keluhan, dll) dirender lewat
    // textContent atau di-escape dulu sebelum dimasukkan ke innerHTML.
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTanggal(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function renderRow(item) {
        const warna = STATUS_COLORS[item.status] || 'bg-gray-200 text-gray-800';
        const statusOptions = ['Menunggu', 'Dikonfirmasi', 'Selesai', 'Dibatalkan']
            .map((s) => `<option value="${s}" ${s === item.status ? 'selected' : ''}>${s}</option>`)
            .join('');
        const nomorAntrean = item.nomor_antrean_display || '-';

        return `
        <tr class="hover:bg-red-50 transition" data-id="${item.id}">
            <td class="p-4">
                <div class="font-mono text-xs font-bold">${escapeHtml(item.kode_pendaftaran || '-')}</div>
                <div class="text-xs text-gray-500 mt-1">Antrean: ${nomorAntrean}</div>
            </td>
            <td class="p-4">
                <div class="font-bold">${escapeHtml(formatTanggal(item.tanggal))}</div>
                <div class="text-sm text-gray-500">${escapeHtml(item.jam)}</div>
            </td>
            <td class="p-4">
                <div class="font-bold">${escapeHtml(item.nama_pasien)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(item.no_hp)}</div>
            </td>
            <td class="p-4">
                <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">${escapeHtml(item.poli)}</span>
                <div class="text-sm mt-1">${escapeHtml(item.dokter)}</div>
            </td>
            <td class="p-4 text-sm text-gray-600 truncate max-w-xs">${escapeHtml(item.keluhan || '-')}</td>
            <td class="p-4">
                <span class="${warna} px-2 py-1 rounded text-xs font-bold">${escapeHtml(item.status)}</span>
            </td>
            <td class="p-4">
                <div class="flex gap-2 items-center">
                    <select class="status-select border border-gray-300 rounded px-2 py-1 text-sm">
                        ${statusOptions}
                    </select>
                    <button class="save-status-btn bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded">✔</button>
                    <button class="delete-btn bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded">🗑</button>
                </div>
            </td>
        </tr>`;
    }

    function renderPagination(pagination) {
        const { page, totalPages } = pagination;
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }
        paginationEl.innerHTML = `
            <button id="prev-page" class="px-3 py-1 rounded border ${page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}" ${page <= 1 ? 'disabled' : ''}>← Sebelumnya</button>
            <span class="text-sm text-gray-600">Halaman ${page} dari ${totalPages}</span>
            <button id="next-page" class="px-3 py-1 rounded border ${page >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}" ${page >= totalPages ? 'disabled' : ''}>Selanjutnya →</button>
        `;
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; loadAppointments(); }
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage++; loadAppointments(); }
        });
    }

    async function loadAppointments() {
        errorBanner.classList.add('hidden');
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Memuat data...</td></tr>';

        const params = { page: currentPage, limit: 10 };
        if (searchInput.value.trim()) params.search = searchInput.value.trim();
        if (statusSelect.value) params.status = statusSelect.value;
        if (poliSelect.value) params.poli = poliSelect.value;
        if (tanggalInput.value) params.tanggal = tanggalInput.value;

        try {
            const res = await Api.listAppointments(params);
            if (res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Belum ada data janji temu.</td></tr>';
            } else {
                tbody.innerHTML = res.data.map(renderRow).join('');
            }
            renderPagination(res.pagination);
        } catch (err) {
            errorBanner.textContent = err.message || 'Gagal memuat data.';
            errorBanner.classList.remove('hidden');
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Gagal memuat data.</td></tr>';
        }
    }

    tbody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        const id = row.dataset.id;

        if (e.target.classList.contains('save-status-btn')) {
            const select = row.querySelector('.status-select');
            e.target.disabled = true;
            try {
                await Api.updateStatus(id, select.value);
                loadAppointments();
            } catch (err) {
                errorBanner.textContent = err.message || 'Gagal memperbarui status.';
                errorBanner.classList.remove('hidden');
                e.target.disabled = false;
            }
        }

        if (e.target.classList.contains('delete-btn')) {
            if (!confirm('Hapus data janji temu ini?')) return;
            e.target.disabled = true;
            try {
                await Api.deleteAppointment(id);
                loadAppointments();
            } catch (err) {
                errorBanner.textContent = err.message || 'Gagal menghapus data.';
                errorBanner.classList.remove('hidden');
                e.target.disabled = false;
            }
        }
    });

    applyBtn.addEventListener('click', () => {
        currentPage = 1;
        loadAppointments();
    });
    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        statusSelect.value = '';
        poliSelect.value = '';
        tanggalInput.value = '';
        currentPage = 1;
        loadAppointments();
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { currentPage = 1; loadAppointments(); }
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
    loadAppointments();
});
