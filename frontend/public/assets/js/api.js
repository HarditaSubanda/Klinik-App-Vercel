/**
 * Wrapper kecil di atas fetch() untuk memanggil REST API backend.
 * - Otomatis menambahkan header Authorization: Bearer <token> jika ada.
 * - Otomatis redirect ke halaman login jika server membalas 401 (token
 *   tidak ada/kedaluwarsa) saat mengakses halaman admin.
 */
const TOKEN_KEY = 'klinik_admin_token';

// Di-attach eksplisit ke `window` (bukan cuma `const` di top-level script)
// supaya bisa diakses secara eksplisit & konsisten dari script lain
// (mis. layout.js) sebagai window.AuthStore, terlepas dari urutan/scoping
// antar file <script>.
window.AuthStore = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY),
    isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY)
};
const AuthStore = window.AuthStore;

async function apiRequest(endpoint, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (auth) {
        const token = AuthStore.getToken();
        if (!token) {
            window.location.href = '/login.html';
            return Promise.reject(new Error('Belum login'));
        }
        headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${window.API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
    } catch (networkErr) {
        throw new Error('Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.');
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (_) {
        // respons tanpa body (jarang terjadi)
    }

    if (response.status === 401 && auth) {
        AuthStore.clear();
        window.location.href = '/login.html?expired=1';
        return Promise.reject(new Error('Sesi berakhir'));
    }

    if (!response.ok) {
        const message = (payload && payload.message) || 'Terjadi kesalahan pada server.';
        const err = new Error(message);
        err.status = response.status;
        err.payload = payload;
        throw err;
    }

    return payload;
}

window.Api = {
    login: (username, password) =>
        apiRequest('/auth/login', { method: 'POST', body: { username, password } }),

    me: () => apiRequest('/auth/me', { auth: true }),

    checkAvailability: (dokter, tanggal, jam) =>
        apiRequest(`/appointments/check-availability?dokter=${encodeURIComponent(dokter)}&tanggal=${encodeURIComponent(tanggal)}&jam=${encodeURIComponent(jam)}`),

    createAppointment: (data) =>
        apiRequest('/appointments', { method: 'POST', body: data }),

    listAppointments: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest(`/appointments${qs ? `?${qs}` : ''}`, { auth: true });
    },

    updateStatus: (id, status) =>
        apiRequest(`/appointments/${id}`, { method: 'PUT', body: { status }, auth: true }),

    deleteAppointment: (id) =>
        apiRequest(`/appointments/${id}`, { method: 'DELETE', auth: true }),

    // --- Fitur 2: Cek Pendaftaran ---
    lookupAppointment: (kode, noHp) =>
        apiRequest(`/appointments/lookup?kode=${encodeURIComponent(kode)}&noHp=${encodeURIComponent(noHp)}`),

    // --- Fitur 7: Riwayat Pendaftaran ---
    getHistory: (noHp) =>
        apiRequest(`/appointments/history?noHp=${encodeURIComponent(noHp)}`),

    // --- Fitur 8: Pembatalan (pasien: kode+HP | admin: token, tanpa body) ---
    cancelAppointment: (id, { kodePendaftaran, noHp } = {}) =>
        apiRequest(`/appointments/${id}/cancel`, {
            method: 'PUT',
            body: { kodePendaftaran, noHp },
            auth: AuthStore.isLoggedIn()
        }),

    // --- Fitur 5 & 9: Dokter ---
    getDoctors: () => apiRequest('/doctors', { auth: AuthStore.isLoggedIn() }),
    getDoctor: (id) => apiRequest(`/doctors/${id}`),
    createDoctor: (data) => apiRequest('/doctors', { method: 'POST', body: data, auth: true }),
    updateDoctor: (id, data) => apiRequest(`/doctors/${id}`, { method: 'PUT', body: data, auth: true }),
    deactivateDoctor: (id) => apiRequest(`/doctors/${id}`, { method: 'DELETE', auth: true }),
    getAvailableSlots: (doctorId, tanggal) =>
        apiRequest(`/doctors/${doctorId}/available-slots?tanggal=${encodeURIComponent(tanggal)}`),

    // --- Fitur 5: Jadwal Dokter ---
    getSchedules: (doctorId) => apiRequest(`/doctors/${doctorId}/schedules`, { auth: AuthStore.isLoggedIn() }),
    createSchedule: (doctorId, data) =>
        apiRequest(`/doctors/${doctorId}/schedules`, { method: 'POST', body: data, auth: true }),
    updateSchedule: (id, data) => apiRequest(`/schedules/${id}`, { method: 'PUT', body: data, auth: true }),
    deleteSchedule: (id) => apiRequest(`/schedules/${id}`, { method: 'DELETE', auth: true }),

    // --- Fitur 3 & 4: Antrean (v4: per poli) ---
    getQueueToday: (tanggal) =>
        apiRequest(`/queue/today${tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : ''}`, { auth: true }),
    callNextQueue: (tanggal, poli) =>
        apiRequest('/queue/next', { method: 'POST', body: { tanggal: tanggal || undefined, poli }, auth: true }),
    // Ringkasan SATU poli (dipakai halaman "Cek Antrean" pasien - butuh tahu poli appointment-nya)
    getQueueSummary: (tanggal, poli, nomorAntrean) =>
        apiRequest(`/queue/summary?tanggal=${encodeURIComponent(tanggal)}&poli=${encodeURIComponent(poli)}&nomorAntrean=${encodeURIComponent(nomorAntrean)}`),

    // --- Widget "Antrean Saat Ini" di halaman beranda (publik, SEMUA poli sekaligus) ---
    getQueueNow: (tanggal) =>
        apiRequest(`/queue/summary${tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : ''}`),

    // --- Fitur 10: Dashboard Admin ---
    getDashboardStats: () => apiRequest('/dashboard/stats', { auth: true })
};
const Api = window.Api;
