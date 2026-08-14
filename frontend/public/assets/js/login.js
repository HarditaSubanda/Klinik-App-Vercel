document.addEventListener('DOMContentLoaded', () => {
    // Sudah login? langsung ke dashboard.
    if (AuthStore.isLoggedIn()) {
        window.location.href = '/admin.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
        document.getElementById('session-expired-banner').classList.remove('hidden');
    }

    const form = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-submit');
    const errorBanner = document.getElementById('login-error-banner');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBanner.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses...';

        const formData = new FormData(form);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const res = await Api.login(username, password);
            AuthStore.setToken(res.token);
            window.location.href = '/admin.html';
        } catch (err) {
            errorBanner.textContent = err.message || 'Username atau password salah.';
            errorBanner.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'MASUK';
        }
    });
});
