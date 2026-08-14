document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('jadwal-list');
    const HARI_URUT = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function groupByHari(schedules) {
        const byHari = {};
        schedules.forEach((s) => {
            if (!byHari[s.hari]) byHari[s.hari] = [];
            byHari[s.hari].push(s.jam);
        });
        return byHari;
    }

    function renderDoctorCard(doctor, schedules) {
        const byHari = groupByHari(schedules);
        const hariRows = HARI_URUT
            .filter((h) => byHari[h] && byHari[h].length)
            .map((h) => `
                <div class="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span class="font-medium text-gray-700 w-24">${escapeHtml(h)}</span>
                    <div class="flex flex-wrap gap-2 justify-end">
                        ${byHari[h].map((jam) => `<span class="bg-red-50 text-k_red text-xs font-bold px-2 py-1 rounded">${escapeHtml(jam)}</span>`).join('')}
                    </div>
                </div>`)
            .join('');

        return `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="bg-k_red p-4 text-white flex justify-between items-center">
                <h3 class="text-lg font-bold">${escapeHtml(doctor.nama)}</h3>
                <span class="bg-white text-k_red text-xs font-bold px-3 py-1 rounded-full">Poli ${escapeHtml(doctor.poli)}</span>
            </div>
            <div class="p-6">
                ${hariRows || '<p class="text-gray-500 text-sm text-center py-4">Belum ada jadwal praktik yang diatur untuk dokter ini.</p>'}
            </div>
        </div>`;
    }

    async function loadJadwal() {
        try {
            const doctorRes = await Api.getDoctors();
            if (doctorRes.doctors.length === 0) {
                listEl.innerHTML = '<p class="text-center text-gray-500 py-8">Belum ada data dokter.</p>';
                return;
            }

            const cards = await Promise.all(doctorRes.doctors.map(async (doctor) => {
                try {
                    const scheduleRes = await Api.getSchedules(doctor.id);
                    return renderDoctorCard(doctor, scheduleRes.schedules);
                } catch (err) {
                    return renderDoctorCard(doctor, []);
                }
            }));

            listEl.innerHTML = cards.join('');
        } catch (err) {
            listEl.innerHTML = `<p class="text-center text-red-600 py-8">${escapeHtml(err.message || 'Gagal memuat jadwal dokter.')}</p>`;
        }
    }

    loadJadwal();
});
