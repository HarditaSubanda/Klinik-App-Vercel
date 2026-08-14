document.addEventListener('DOMContentLoaded', () => {
    const formCard = document.getElementById('form-card');
    const successCard = document.getElementById('success-card');
    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const tanggalInput = document.getElementById('input-tanggal');
    const jamSelect = document.getElementById('input-jam');
    const dokterSelect = document.getElementById('input-dokter');
    const poliSelect = document.getElementById('input-poli');
    const availabilityHint = document.getElementById('availability-hint');

    // Tidak boleh pilih tanggal di masa lalu
    const today = new Date().toISOString().split('T')[0];
    tanggalInput.setAttribute('min', today);

    let doctors = []; // { id, nama, poli, status }

    function hideBanners() {
        errorBanner.classList.add('hidden');
        errorBanner.classList.remove('flex');
    }

    function currentDoctor() {
        return doctors.find((d) => d.nama === dokterSelect.value) || null;
    }

    // Fitur 5 & 6: dropdown dokter hanya berisi dokter yang sedang Aktif,
    // otomatis mengikuti poli yang dipilih supaya pasien tidak salah pilih.
    function renderDoctorOptions() {
        const poli = poliSelect.value;
        const filtered = doctors.filter((d) => d.poli === poli);
        if (filtered.length === 0) {
            dokterSelect.innerHTML = '<option value="">Tidak ada dokter tersedia untuk poli ini</option>';
            return;
        }
        dokterSelect.innerHTML = filtered.map((d) => `<option value="${d.nama}">${d.nama}</option>`).join('');
    }

    async function loadDoctors() {
        try {
            const res = await Api.getDoctors();
            doctors = res.doctors;
            renderDoctorOptions();
            await refreshJamOptions();
        } catch (err) {
            dokterSelect.innerHTML = '<option value="">Gagal memuat daftar dokter</option>';
        }
    }

    // Fitur 5 & 6: jam yang tampil HANYA jam yang memang jadwal dokter itu
    // pada hari tsb dan belum dikonfirmasi pasien lain (validasi di backend,
    // bukan cuma di frontend).
    async function refreshJamOptions() {
        const doctor = currentDoctor();
        const tanggal = tanggalInput.value;
        availabilityHint.textContent = '';

        if (!doctor || !tanggal) {
            jamSelect.innerHTML = '<option value="">Pilih dokter & tanggal terlebih dahulu</option>';
            return;
        }

        jamSelect.innerHTML = '<option value="">Memuat jadwal...</option>';
        try {
            const res = await Api.getAvailableSlots(doctor.id, tanggal);
            const tersedia = res.slots.filter((s) => s.tersedia);
            if (tersedia.length === 0) {
                jamSelect.innerHTML = '<option value="">Tidak ada jadwal tersedia pada tanggal ini</option>';
                availabilityHint.textContent = res.hari
                    ? `${doctor.nama} tidak praktik / sudah penuh pada hari ${res.hari}. Silakan pilih tanggal lain.`
                    : 'Tidak ada jadwal tersedia.';
                availabilityHint.className = 'text-sm mt-1 text-red-600 font-medium';
                return;
            }
            jamSelect.innerHTML = tersedia.map((s) => `<option value="${s.jam}">${s.jam}</option>`).join('');
            availabilityHint.textContent = `✔ ${tersedia.length} jadwal tersedia pada hari ${res.hari}`;
            availabilityHint.className = 'text-sm mt-1 text-green-600 font-medium';
        } catch (err) {
            jamSelect.innerHTML = '<option value="">Gagal memuat jadwal</option>';
        }
    }

    poliSelect.addEventListener('change', () => { renderDoctorOptions(); refreshJamOptions(); });
    dokterSelect.addEventListener('change', refreshJamOptions);
    tanggalInput.addEventListener('change', refreshJamOptions);

    function formatTanggalPanjang(iso) {
        const d = new Date(`${iso}T00:00:00`);
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function showSuccess(appointment) {
        document.getElementById('result-kode').textContent = appointment.kode_pendaftaran;
        document.getElementById('result-nama').textContent = appointment.nama_pasien;
        document.getElementById('result-dokter').textContent = appointment.dokter;
        document.getElementById('result-poli').textContent = appointment.poli;
        document.getElementById('result-tanggal').textContent = formatTanggalPanjang(appointment.tanggal.slice(0, 10));
        document.getElementById('result-jam').textContent = appointment.jam;
        document.getElementById('result-status').textContent = appointment.status;

        formCard.classList.add('hidden');
        successCard.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.getElementById('print-btn').addEventListener('click', () => {
        ['kode', 'nama', 'dokter', 'poli', 'tanggal', 'jam', 'status'].forEach((field) => {
            document.getElementById(`print-${field}`).textContent = document.getElementById(`result-${field}`).textContent;
        });
        document.getElementById('print-tanggal-cetak').textContent = new Date().toLocaleString('id-ID');
        window.print();
    });

    document.getElementById('new-booking-btn').addEventListener('click', () => {
        form.reset();
        tanggalInput.setAttribute('min', today);
        renderDoctorOptions();
        refreshJamOptions();
        successCard.classList.add('hidden');
        formCard.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideBanners();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await Api.createAppointment(data);
            showSuccess(res.appointment);
        } catch (err) {
            errorMessage.textContent = err.message || 'Terjadi kesalahan. Silakan coba lagi.';
            errorBanner.classList.remove('hidden');
            errorBanner.classList.add('flex');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Pendaftaran';
        }
    });

    loadDoctors();
});
