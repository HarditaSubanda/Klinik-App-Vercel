document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cek-form');
    const btn = document.getElementById('cek-btn');
    const resultArea = document.getElementById('result-area');
    const emptyMessage = document.getElementById('empty-message');

    const STATUS_COLORS = {
        Menunggu: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        Dikonfirmasi: 'bg-blue-100 text-blue-800 border-blue-300',
        Selesai: 'bg-green-100 text-green-800 border-green-300',
        Dibatalkan: 'bg-red-100 text-red-800 border-red-300'
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

    function render(appointment, noHp) {
        const warna = STATUS_COLORS[appointment.status] || 'bg-gray-100 text-gray-800 border-gray-300';
        const bisaDibatalkan = ['Menunggu', 'Dikonfirmasi'].includes(appointment.status);
        const nomorAntrean = appointment.nomor_antrean_display || null;

        resultArea.innerHTML = `
            <div class="border-2 ${warna} rounded-lg p-6">
                <div class="text-center mb-4">
                    <p class="text-xs text-gray-500">Kode Pendaftaran</p>
                    <p class="text-xl font-mono font-bold">${escapeHtml(appointment.kode_pendaftaran)}</p>
                </div>
                <dl class="grid grid-cols-2 gap-y-2 text-sm mb-4">
                    <dt class="text-gray-500">Nama</dt><dd class="font-bold text-right">${escapeHtml(appointment.nama_pasien)}</dd>
                    <dt class="text-gray-500">Poli</dt><dd class="font-bold text-right">${escapeHtml(appointment.poli)}</dd>
                    <dt class="text-gray-500">Dokter</dt><dd class="font-bold text-right">${escapeHtml(appointment.dokter)}</dd>
                    <dt class="text-gray-500">Tanggal</dt><dd class="font-bold text-right">${escapeHtml(formatTanggal(appointment.tanggal))}</dd>
                    <dt class="text-gray-500">Jam</dt><dd class="font-bold text-right">${escapeHtml(appointment.jam)}</dd>
                    ${nomorAntrean ? `<dt class="text-gray-500">Nomor Antrean</dt><dd class="font-bold text-right">${nomorAntrean}</dd>` : ''}
                </dl>
                <div class="text-center mb-4">
                    <span class="inline-block px-4 py-1.5 rounded-full font-bold text-sm ${warna}">${escapeHtml(appointment.status)}</span>
                </div>
                ${nomorAntrean ? `<a href="/antrean.html" class="block text-center text-sm text-k_red underline mb-3">Lihat status antrean →</a>` : ''}
                ${bisaDibatalkan ? `<button id="cancel-btn" class="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition">Batalkan Pendaftaran</button>` : ''}
            </div>
        `;
        resultArea.classList.remove('hidden');
        emptyMessage.classList.add('hidden');

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                if (!confirm('Apakah Anda yakin ingin membatalkan pendaftaran ini?')) return;
                cancelBtn.disabled = true;
                cancelBtn.textContent = 'Membatalkan...';
                try {
                    const res = await Api.cancelAppointment(appointment.id, {
                        kodePendaftaran: appointment.kode_pendaftaran,
                        noHp
                    });
                    render(res.appointment, noHp);
                } catch (err) {
                    alert(err.message || 'Gagal membatalkan pendaftaran.');
                    cancelBtn.disabled = false;
                    cancelBtn.textContent = 'Batalkan Pendaftaran';
                }
            });
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        resultArea.classList.add('hidden');
        emptyMessage.classList.add('hidden');
        btn.disabled = true;
        btn.textContent = 'Mencari...';

        const formData = new FormData(form);
        const kode = formData.get('kode').trim().toUpperCase();
        const noHp = formData.get('noHp').trim();

        try {
            const res = await Api.lookupAppointment(kode, noHp);
            render(res.appointment, noHp);
        } catch (err) {
            emptyMessage.textContent = 'Data pendaftaran tidak ditemukan.';
            emptyMessage.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Cek Status';
        }
    });
});
