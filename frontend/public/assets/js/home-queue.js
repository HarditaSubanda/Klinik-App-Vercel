/**
 * Widget "Antrean Saat Ini" di halaman beranda.
 * Mengambil data publik dari GET /api/queue/summary (tanpa login, tanpa
 * membocorkan nama pasien lain) dan me-refresh otomatis setiap 10 detik
 * supaya terasa "live" tanpa perlu WebSocket.
 *
 * Sekarang menampilkan SEMUA KATEGORI POLI sekaligus (nomor antrean sudah
 * dipisah per poli - Umum/Gigi/Anak masing-masing punya seri sendiri), dan
 * bisa mengucapkan pengumuman panggilan otomatis (Web Speech API) begitu
 * mendeteksi nomor yang sedang dilayani di suatu poli berubah - berguna
 * kalau halaman ini dipasang di TV/monitor ruang tunggu.
 */
document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('live-queue-card');
    if (!card) return; // halaman ini tidak punya widget antrean live

    const listEl = document.getElementById('live-queue-list');
    const statusEl = document.getElementById('live-queue-status');
    const soundToggleBtn = document.getElementById('live-queue-sound-toggle');

    const REFRESH_MS = 10000;
    let pollTimer = null;
    let soundEnabled = false;
    let isFirstLoad = true;
    // Ingat nomor yang sedang dilayani per poli dari polling sebelumnya,
    // supaya pengumuman suara hanya diucapkan saat nomornya BERUBAH
    // (bukan diulang-ulang setiap 10 detik selama nomornya masih sama).
    const lastServed = {};

    function formatJam(date) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function renderList(poliSummaries) {
        listEl.innerHTML = poliSummaries.map((s) => {
            const meta = (window.POLI_META && window.POLI_META[s.poli]) || { label: s.poli, solid: 'bg-gray-500' };
            return `
            <div class="p-4 md:p-5 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="w-2.5 h-2.5 rounded-full ${meta.solid} shrink-0"></span>
                    <div>
                        <p class="font-bold text-gray-800">Poli ${meta.label}</p>
                        <p class="text-xs text-gray-500">${typeof s.totalMenunggu === 'number' ? s.totalMenunggu : '—'} pasien menunggu</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-400 mb-0.5">Sedang dilayani</p>
                    <p class="text-2xl font-mono font-bold text-k_red">${s.nomorSedangDilayaniDisplay || '—'}</p>
                </div>
            </div>`;
        }).join('');
    }

    function checkAndAnnounce(poliSummaries) {
        poliSummaries.forEach((s) => {
            const prev = lastServed[s.poli];
            const current = s.nomorSedangDilayani;
            // Umumkan hanya kalau: bukan pemuatan pertama halaman, suara
            // diaktifkan, dan nomornya benar-benar berubah (naik) - supaya
            // tidak mengumumkan ulang nomor yang sama tiap kali polling.
            if (!isFirstLoad && soundEnabled && current && current !== prev) {
                window.QueueAnnouncer && window.QueueAnnouncer.announceQueue(s.nomorSedangDilayaniDisplay, s.poli);
            }
            lastServed[s.poli] = current;
        });
    }

    async function refresh() {
        try {
            const res = await Api.getQueueNow();
            renderList(res.poliSummaries);
            checkAndAnnounce(res.poliSummaries);
            statusEl.textContent = `Diperbarui otomatis • Terakhir: ${formatJam(new Date())}`;
            isFirstLoad = false;
        } catch (err) {
            statusEl.textContent = 'Tidak dapat memuat data antrean saat ini.';
        }
    }

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            if (soundEnabled) {
                soundToggleBtn.textContent = '🔊 Suara Panggilan Aktif';
                soundToggleBtn.classList.add('bg-opacity-40');
                // Klik tombol ini sekaligus jadi "user gesture" yang dibutuhkan
                // sebagian browser sebelum mengizinkan speechSynthesis berbunyi,
                // plus langsung memberi konfirmasi ke pengguna bahwa suara aktif.
                window.QueueAnnouncer && window.QueueAnnouncer.speak('Suara panggilan antrean diaktifkan.');
            } else {
                soundToggleBtn.textContent = '🔈 Aktifkan Suara Panggilan';
                soundToggleBtn.classList.remove('bg-opacity-40');
                window.speechSynthesis && window.speechSynthesis.cancel();
            }
        });
    }

    refresh();
    pollTimer = setInterval(refresh, REFRESH_MS);

    // Hentikan polling kalau tab sedang tidak dilihat, lanjutkan lagi saat aktif -
    // menghemat request yang tidak perlu.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(pollTimer);
        } else {
            refresh();
            pollTimer = setInterval(refresh, REFRESH_MS);
        }
    });
});
