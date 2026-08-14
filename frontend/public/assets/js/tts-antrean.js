/**
 * Efek suara panggilan antrean pakai Web Speech API (speechSynthesis),
 * bahasa Indonesia: "Nomor antrian <huruf> <angka>, silakan ke Poli <nama>."
 *
 * Dipicu dari dua tempat:
 *  1. Halaman admin "Manajemen Antrean" - begitu admin klik "Panggil
 *     Berikutnya" dan berhasil (bukan status blocked).
 *  2. Widget "Antrean Saat Ini" di beranda - begitu polling mendeteksi
 *     nomor yang sedang dilayani BERTAMBAH (berubah), supaya halaman ini
 *     juga bisa dipasang di TV/monitor ruang tunggu sebagai pengumuman
 *     otomatis untuk pasien.
 */
(function () {
    if (!('speechSynthesis' in window)) {
        window.QueueAnnouncer = { speak: function () {}, announceQueue: function () {}, supported: false };
        return;
    }

    let indonesianVoice = null;

    function pickVoice() {
        const voices = window.speechSynthesis.getVoices();
        indonesianVoice = voices.find((v) => v.lang === 'id-ID')
            || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('id'))
            || null;
    }

    pickVoice();
    if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    }

    function speak(text) {
        try {
            window.speechSynthesis.cancel(); // hentikan ucapan sebelumnya supaya tidak menumpuk/tabrakan
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'id-ID';
            if (indonesianVoice) utter.voice = indonesianVoice;
            utter.rate = 0.95;
            utter.pitch = 1;
            window.speechSynthesis.speak(utter);
        } catch (err) {
            // Efek suara bersifat pelengkap - kalau browser tidak
            // mendukung/menolak, jangan sampai mengganggu fungsi utama halaman.
        }
    }

    /**
     * announceQueue("B-005", "Gigi") -> "Nomor antrian B lima, silakan ke Poli Gigi."
     * Huruf & angka sengaja dipisah (bukan mengirim "B-005" mentah ke TTS)
     * supaya diucapkan natural sebagai angka biasa, bukan dieja per karakter
     * atau dibaca sebagai "B minus nol nol lima".
     */
    function announceQueue(nomorDisplay, poli) {
        if (!nomorDisplay || nomorDisplay === '-') return;
        const parts = nomorDisplay.split('-');
        const huruf = parts[0];
        const angka = parseInt(parts[1], 10);
        const meta = window.POLI_META && window.POLI_META[poli];
        const namaPoli = meta ? meta.label : poli;
        const teks = `Nomor antrian ${huruf} ${Number.isNaN(angka) ? parts[1] : angka}, silakan ke Poli ${namaPoli}.`;
        speak(teks);
    }

    window.QueueAnnouncer = { speak, announceQueue, supported: true };
})();
