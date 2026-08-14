document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('antrean-form');
    const btn = document.getElementById('antrean-btn');
    const resultArea = document.getElementById('result-area');
    const emptyMessage = document.getElementById('empty-message');

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function render(appointment, summary) {
        let statusLabel = 'Menunggu';
        let statusColor = 'bg-yellow-100 text-yellow-800';

        if (appointment.status === 'Selesai') {
            statusLabel = 'Selesai';
            statusColor = 'bg-green-100 text-green-800';
        } else if (appointment.status === 'Dibatalkan') {
            statusLabel = 'Dibatalkan';
            statusColor = 'bg-red-100 text-red-800';
        } else if (appointment.status === 'Menunggu') {
            statusLabel = 'Menunggu konfirmasi admin';
            statusColor = 'bg-yellow-100 text-yellow-800';
        } else if (appointment.queue_status === 'Dipanggil') {
            statusLabel = 'Sedang Dipanggil';
            statusColor = 'bg-blue-100 text-blue-800';
        } else {
            statusLabel = 'Menunggu';
            statusColor = 'bg-yellow-100 text-yellow-800';
        }

        const nomorDisplay = appointment.nomor_antrean_display;
        const poliMeta = (window.POLI_META && window.POLI_META[appointment.poli]) || null;
        const poliLabel = poliMeta ? poliMeta.label : appointment.poli;

        if (!nomorDisplay) {
            resultArea.innerHTML = `
                <div class="text-center border rounded-lg p-6">
                    <span class="inline-block px-4 py-1.5 rounded-full font-bold text-sm ${statusColor} mb-3">${escapeHtml(statusLabel)}</span>
                    <p class="text-gray-600 text-sm">Nomor antrean akan muncul di sini setelah pendaftaran Anda dikonfirmasi oleh admin klinik.</p>
                </div>`;
            resultArea.classList.remove('hidden');
            emptyMessage.classList.add('hidden');
            return;
        }

        resultArea.innerHTML = `
            <div class="text-center border-2 border-k_red rounded-lg p-6">
                <p class="text-sm text-gray-500 mb-1">Nomor Anda &bull; Poli ${escapeHtml(poliLabel)}</p>
                <p class="text-4xl font-mono font-bold text-k_red mb-4">${escapeHtml(nomorDisplay)}</p>
                <span class="inline-block px-4 py-1.5 rounded-full font-bold text-sm ${statusColor} mb-4">${escapeHtml(statusLabel)}</span>
                <div class="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                    <div>
                        <p class="text-gray-500">Nomor sedang dilayani</p>
                        <p class="font-bold text-lg">${summary.nomorSedangDilayaniDisplay || '-'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500">Antrean di depan Anda</p>
                        <p class="font-bold text-lg">${summary.jumlahDiDepan}</p>
                    </div>
                </div>
            </div>`;
        resultArea.classList.remove('hidden');
        emptyMessage.classList.add('hidden');
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
            const lookupRes = await Api.lookupAppointment(kode, noHp);
            const appointment = lookupRes.appointment;
            let summary = { nomorSedangDilayani: null, nomorSedangDilayaniDisplay: null, jumlahDiDepan: 0 };
            if (appointment.nomor_antrean) {
                const tanggal = String(appointment.tanggal).slice(0, 10);
                const summaryRes = await Api.getQueueSummary(tanggal, appointment.poli, appointment.nomor_antrean);
                summary = summaryRes;
            }
            render(appointment, summary);
        } catch (err) {
            emptyMessage.textContent = 'Data pendaftaran tidak ditemukan.';
            emptyMessage.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Lihat Antrean';
        }
    });
});
