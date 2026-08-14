/**
 * Menyuntikkan header & footer yang sama ke semua halaman (menggantikan
 * peran partials/header.ejs & partials/footer.ejs di versi EJS lama),
 * plus menyesuaikan menu berdasarkan status login admin.
 */
(function () {
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');

    function navLink(href, label, extraClass) {
        const isActive = currentPath === href || (href === '/' && currentPath === '/index.html');
        const activeClass = isActive ? 'bg-white bg-opacity-20' : '';
        return `<a href="${href}" class="px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-300 font-medium backdrop-blur-sm ${activeClass} ${extraClass || ''}">${label}</a>`;
    }

    function renderAuthArea(isLoggedIn) {
        if (isLoggedIn) {
            return `
                <a href="/admin.html" class="px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-300 font-medium backdrop-blur-sm">Dashboard Admin</a>
                <button id="logout-btn" class="ml-2 bg-white text-amber-600 px-6 py-2.5 rounded-full font-bold hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-amber-200">
                    Logout
                </button>`;
        }
        return `
            <a href="/login.html" class="ml-2 bg-white text-amber-600 px-6 py-2.5 rounded-full font-bold hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-amber-200 flex items-center gap-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Login Staff
            </a>`;
    }

    function renderHeader() {
        const isLoggedIn = window.AuthStore ? window.AuthStore.isLoggedIn() : false;
        return `
        <nav class="relative bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white shadow-xl sticky top-0 z-50 border-b-4 border-amber-700">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
            <div class="container mx-auto px-6 py-4">
                <div class="flex justify-between items-center">
                    <a href="/" class="text-2xl font-bold flex items-center gap-3 group">
                        <div class="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                            <svg width="28" height="28" viewBox="0 0 100 100" class="text-amber-600">
                                <path d="M30,80 Q30,30 50,10 Q70,30 70,80" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
                                <path d="M40,80 Q40,40 50,25 Q60,40 60,80" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
                                <circle cx="50" cy="15" r="5" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="flex flex-col">
                            <span class="block text-white leading-tight tracking-wide drop-shadow-md">TALHA</span>
                            <span class="block text-sm text-amber-100 font-normal -mt-1">Medical Clinic</span>
                        </div>
                    </a>

                    <button id="menu-btn" class="md:hidden focus:outline-none text-white hover:text-amber-100 transition-colors bg-amber-700 bg-opacity-30 p-2 rounded-lg backdrop-blur-sm">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>

                    <div class="hidden md:flex space-x-0.5 items-center text-sm">
                        ${navLink('/', 'Beranda')}
                        ${navLink('/booking.html', 'Buat Janji')}
                        ${navLink('/jadwal-dokter.html', 'Jadwal Dokter')}
                        ${navLink('/cek-pendaftaran.html', 'Cek Pendaftaran')}
                        ${navLink('/riwayat.html', 'Riwayat')}
                        ${navLink('/antrean.html', 'Antrean')}
                        ${navLink('/informasi.html', 'Informasi')}
                        ${renderAuthArea(isLoggedIn)}
                    </div>
                </div>

                <div id="mobile-menu" class="hidden md:hidden mt-4 flex flex-col space-y-3 pb-4 border-t border-amber-400 border-opacity-50 pt-4">
                    ${navLink('/', 'Beranda', 'block')}
                    ${navLink('/booking.html', 'Buat Janji', 'block')}
                    ${navLink('/jadwal-dokter.html', 'Jadwal Dokter', 'block')}
                    ${navLink('/cek-pendaftaran.html', 'Cek Pendaftaran', 'block')}
                    ${navLink('/riwayat.html', 'Riwayat', 'block')}
                    ${navLink('/antrean.html', 'Antrean', 'block')}
                    ${navLink('/informasi.html', 'Informasi', 'block')}
                    ${isLoggedIn
                        ? `${navLink('/admin.html', 'Dashboard Admin', 'block')}<button id="logout-btn-mobile" class="bg-white text-amber-600 px-6 py-3 rounded-full font-bold hover:bg-amber-50 transition-all duration-300 block text-center shadow-lg border-2 border-amber-200 w-full">Logout</button>`
                        : `<a href="/login.html" class="bg-white text-amber-600 px-6 py-3 rounded-full font-bold hover:bg-amber-50 transition-all duration-300 block text-center shadow-lg border-2 border-amber-200">Login Staff</a>`
                    }
                </div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-40"></div>
        </nav>`;
    }

    function renderFooter() {
        return `
        <footer class="bg-gray-800 text-white mt-12 py-6">
            <div class="container mx-auto text-center">
                <p>&copy; 2026 Sistem Informasi Klinik Talhah.</p>
            </div>
        </footer>`;
    }

    function handleLogout() {
        window.AuthStore.clear();
        window.location.href = '/login.html';
    }

    // Sub-navigasi khusus halaman admin (Dashboard, Appointment, Antrean,
    // Dokter & Jadwal) - dipanggil manual oleh tiap halaman admin-*.html lewat
    // window.renderAdminSubnav('dashboard'|'appointments'|'antrean'|'dokter')
    // supaya tab "aktif" bisa disesuaikan per halaman tanpa duplikasi markup.
    window.renderAdminSubnav = function (active) {
        const el = document.getElementById('admin-subnav');
        if (!el) return;

        const tabs = [
            { key: 'dashboard', href: '/admin.html', label: 'Dashboard' },
            { key: 'appointments', href: '/admin-appointments.html', label: 'Appointment' },
            { key: 'antrean', href: '/admin-antrean.html', label: 'Antrean' },
            { key: 'dokter', href: '/admin-dokter.html', label: 'Dokter & Jadwal' }
        ];

        el.innerHTML = `
        <div class="bg-white rounded-lg shadow mb-6 flex flex-wrap gap-1 p-1.5">
            ${tabs.map((t) => `
                <a href="${t.href}" class="px-4 py-2 rounded-md text-sm font-bold transition ${
                    t.key === active ? 'bg-k_red text-white' : 'text-gray-600 hover:bg-gray-100'
                }">${t.label}</a>
            `).join('')}
        </div>`;
    };

    document.addEventListener('DOMContentLoaded', () => {
        const headerEl = document.getElementById('app-header');
        const footerEl = document.getElementById('app-footer');
        if (headerEl) headerEl.innerHTML = renderHeader();
        if (footerEl) footerEl.innerHTML = renderFooter();

        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');
        if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);
    });
})();
