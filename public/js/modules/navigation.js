import { initLgpd } from './lgpd.js';
import { loadAdminDashboard } from './sections/adminDashboard.js';
import { loadUserDashboard } from './sections/userDashboard.js';
import { loadUsersView } from './sections/users.js';
import { loadSectorsView } from './sections/sectors.js';
import { loadAdminTypesView } from './sections/reportTypes.js';
import { loadLogsView } from './sections/logs.js';
import { loadSuperAdminDashboard } from './sections/superAdminDashboard.js';
import { loadAdminStatsView } from './sections/adminStats.js';
import { getState } from '../core/state.js';

export function initNavigation() {
    document.addEventListener('DOMContentLoaded', () => {
        initLgpd();
        attachNavHandlers();
        loadView('dashboard');
    });
}

function attachNavHandlers() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const onclick = link.getAttribute('onclick') || '';
            const match = onclick.match(/loadView\('(.*?)'\)/);
            if (match) loadView(match[1]);
        });
    });
}

export function loadView(viewName) {
    const mainContent = document.getElementById('main-content');
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[onclick*="${viewName}"]`);
    if (activeLink) activeLink.classList.add('active');

    const { currentUser } = getState();

    switch (viewName) {
        case 'reports':
        case 'dashboard':
            if (currentUser.role === 'superadmin') loadSuperAdminDashboard();
            else if (currentUser.role === 'admin') loadAdminDashboard();
            else loadUserDashboard();
            break;
        case 'users':
            if (currentUser.role === 'admin' || currentUser.role === 'superadmin') loadUsersView();
            else mainContent.innerHTML = `<p class="text-danger">Acesso negado. (Perfil: ${currentUser.role})</p>`;
            break;
        case 'sectors':
            if (currentUser.role === 'admin') loadSectorsView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'admin_types':
            if (currentUser.role === 'admin') loadAdminTypesView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'logs':
            if (currentUser.role === 'superadmin') loadLogsView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'superadmin_dashboard':
            if (currentUser.role === 'superadmin') loadSuperAdminDashboard();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'admin_stats':
            if (currentUser.role === 'admin') loadAdminStatsView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        default:
            if (mainContent) mainContent.innerHTML = '<h2>Página não encontrada</h2>';
    }
}
