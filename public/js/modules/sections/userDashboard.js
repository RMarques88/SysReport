import { getProjectBaseUrl } from '../../core/base.js';
import { TRANSLATE_STATUS } from '../../core/constants.js';
import { setAllUserReports, getState } from '../../core/state.js';

export async function loadUserDashboard() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const style = document.createElement('style');
    style.innerHTML = `
        .user-dashboard-container { padding: 0; max-width: 100%; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .dashboard-header h2 { font-size: 1.5rem; margin: 0; }
        .filters-container { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .filter-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; outline: none; transition: all 0.2s; min-width: 140px; }
        .filter-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        .report-card { background: var(--card-bg); border-radius: 12px; padding: 1.25rem; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); transition: all 0.3s ease; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .report-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--primary-color); }
        .card-status-badge { position: absolute; top: 1rem; right: 1rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; }
        .status-pending { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
        .status-submitted { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
        .status-rejected { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .card-icon { font-size: 2rem; color: var(--primary-color); margin-bottom: 0.75rem; opacity: 0.8; }
        .card-title { font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.4rem; line-height: 1.3; padding-right: 4rem; }
        .card-meta { color: var(--text-muted); font-size: 0.8rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .card-actions { display: flex; gap: 0.5rem; margin-top: auto; flex-direction: column; }
        .report-card.shared { border-left: 3px solid #8b5cf6; background: #faf5ff; }
        .report-card.shared .card-icon { color: #8b5cf6; }
        .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
    `;
    document.head.appendChild(style);

    mainContent.innerHTML = `
        <div class="user-dashboard-container">
            <div class="dashboard-header">
                <h2>Meus Relatórios</h2>
                <button class="btn btn-secondary btn-sm" onclick="window.App.loadUserArchivedReports()"><i class="fas fa-archive"></i> Ver Arquivados</button>
            </div>
            
            <div class="filters-container">
                <input type="text" id="userFilterSearch" class="filter-input" placeholder="Buscar relatório..." onkeyup="window.App.renderUserReports()">
                <select id="userFilterStatus" class="filter-input" onchange="window.App.renderUserReports()">
                    <option value="">Todos os Status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="SUBMITTED">Enviado</option>
                    <option value="REJECTED">Rejeitado</option>
                </select>
                <select id="userFilterSource" class="filter-input" onchange="window.App.renderUserReports()">
                    <option value="">Todos (Origem)</option>
                    <option value="mine">Meus Relatórios</option>
                    <option value="shared">Compartilhados Comigo</option>
                </select>
                <select id="userFilterType" class="filter-input" onchange="window.App.renderUserReports()">
                    <option value="">Todos os Tipos</option>
                </select>
            </div>

            <div id="userReportsGrid" class="reports-grid"></div>
        </div>
    `;

    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/reports.php?t=' + Date.now());
        const reports = await res.json();
        setAllUserReports(reports);
        populateUserTypeFilter();
        renderUserReports();
    } catch (e) {
        console.error('Error loading user reports', e);
        Swal.fire('Erro', 'Erro ao carregar relatórios.', 'error');
    }
}

export async function loadUserArchivedReports() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="user-dashboard-container">
            <div class="dashboard-header">
                <h2>Relatórios Arquivados</h2>
                <button class="btn btn-secondary btn-sm" onclick="window.App.loadUserDashboard()"><i class="fas fa-arrow-left"></i> Voltar</button>
            </div>
            
            <div class="filters-container">
                <input type="text" id="userFilterSearch" class="filter-input" placeholder="Buscar relatório..." onkeyup="window.App.renderUserReports(true)">
                <select id="userFilterType" class="filter-input" onchange="window.App.renderUserReports(true)">
                    <option value="">Todos os Tipos</option>
                </select>
            </div>

            <div id="userReportsGrid" class="reports-grid">
                <div class="text-center w-100"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando arquivados...</div>
            </div>
        </div>
    `;

    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/reports.php?archived=true&t=' + Date.now());
        const reports = await res.json();
        setAllUserReports(reports);
        populateUserTypeFilter();
        renderUserReports(true);
    } catch (e) {
        console.error('Error loading archived reports', e);
        Swal.fire('Erro', 'Erro ao carregar relatórios arquivados.', 'error');
    }
}

export function populateUserTypeFilter() {
    const select = document.getElementById('userFilterType');
    if (!select) return;
    const types = new Set();
    (getState().allUserReports || []).forEach(r => types.add(r.report_type));
    select.innerHTML = '<option value="">Todos os Tipos</option>';
    types.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
    });
}

export function renderUserReports(isArchived = false) {
    const container = document.getElementById('userReportsGrid');
    if (!container) return;
    const search = document.getElementById('userFilterSearch') ? document.getElementById('userFilterSearch').value.toLowerCase() : '';
    const statusFilter = document.getElementById('userFilterStatus') ? document.getElementById('userFilterStatus').value : '';
    const sourceFilter = document.getElementById('userFilterSource') ? document.getElementById('userFilterSource').value : '';
    const typeFilter = document.getElementById('userFilterType') ? document.getElementById('userFilterType').value : '';

    let reports = getState().allUserReports || [];

    reports = reports.map(r => ({
        ...r,
        status: (r.status || 'PENDING').toUpperCase(),
        isShared: (r.is_shared == 1 || r.is_shared === '1' || r.is_shared === true)
    }));

    if (search) reports = reports.filter(r => r.report_type.toLowerCase().includes(search));
    if (statusFilter) reports = reports.filter(r => r.status === statusFilter);
    if (typeFilter) reports = reports.filter(r => r.report_type === typeFilter);
    if (sourceFilter) {
        if (sourceFilter === 'mine') reports = reports.filter(r => !r.isShared);
        if (sourceFilter === 'shared') reports = reports.filter(r => r.isShared);
    }

    // Sort by due date (asc) then created_at (desc)
    reports.sort((a, b) => {
        const dateA = new Date(a.due_date || '9999-12-31');
        const dateB = new Date(b.due_date || '9999-12-31');
        return dateA - dateB;
    });

    if (reports.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted" style="grid-column: 1/-1;">Nenhum relatório encontrado.</div>';
        return;
    }

    let html = '';
    reports.forEach(r => {
        const status = r.status;
        const isShared = r.isShared;
        const isScheduled = status === 'SCHEDULED';

        let badgeClass = '';
        let icon = '';
        let displayStatus = status;

        if (isScheduled) {
            badgeClass = 'badge-submitted'; // Look like submitted
            icon = 'fa-calendar-check';
            displayStatus = 'AGENDADO';
        } else {
            switch (status) {
                case 'PENDING': 
                    badgeClass = 'badge-pending'; 
                    icon = 'fa-clock'; 
                    displayStatus = 'PENDENTE';
                    break;
                case 'SUBMITTED': 
                    badgeClass = 'badge-submitted'; 
                    icon = 'fa-check-circle'; 
                    displayStatus = 'ENVIADO';
                    break;
                case 'REJECTED': 
                    badgeClass = 'badge-rejected'; 
                    icon = 'fa-times-circle'; 
                    displayStatus = 'REJEITADO';
                    break;
                default: 
                    badgeClass = 'badge-secondary'; 
                    icon = 'fa-question';
                    displayStatus = status;
            }
        }

        const sharedClass = isShared ? 'shared' : '';
        const sharedLabel = isShared ? `<div class="shared-label"><i class="fas fa-share-alt"></i> Compartilhado de ${r.owner_name || 'Alguém'}</div>` : '';

        // Calculate days for next delivery if scheduled
        let scheduledMsg = '';
        if (isScheduled && r.due_date) {
            const due = new Date(r.due_date);
            const now = new Date();
            const diffTime = due - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (diffDays > 0) {
                scheduledMsg = `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #d97706; font-weight: 600;">Próxima entrega em ${diffDays} dias</div>`;
            } else {
                scheduledMsg = `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #d97706; font-weight: 600;">Entrega hoje!</div>`;
            }
        }

        // Eye Button for Quick View
        const eyeButton = `<button class="btn btn-sm btn-secondary" onclick="window.App.previewReport(${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Visualizar"><i class="fas fa-eye"></i></button>`;

        const btnLabel = status === 'PENDING' ? 'Enviar' : 'Reenviar';
        let uploadButton = '';
        
        if (!isShared && !isArchived) {
            if (isScheduled) {
                uploadButton = `
                    <button class="btn btn-secondary btn-sm w-100" disabled style="opacity: 0.7; cursor: not-allowed;">
                        <i class="fas fa-clock"></i> Aguardando Prazo
                    </button>
                `;
            } else {
                uploadButton = `
                    <button class="btn btn-primary btn-sm w-100" onclick="window.App.openUploadModal('${r.id}', '${r.report_type}', '${status}')">
                        <i class="fas fa-upload"></i> ${btnLabel}
                    </button>
                `;
            }
        }

        // Download link for submitted
        let reportDownloadLink = '';
        if (r.file_path && !isScheduled && status !== 'PENDING') {
            reportDownloadLink = `
                <a href="${getProjectBaseUrl()}/uploads/${r.file_path}" class="btn btn-sm btn-secondary mt-2" style="width: 100%; justify-content: center; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155;" download>
                    <i class="fas fa-download"></i> Baixar Arquivo
                </a>
            `;
        }

        // Template download
        let templateLink = '';
        if (r.template_path) {
             templateLink = `
                <a href="${getProjectBaseUrl()}/uploads/templates/${r.template_path}" class="btn btn-sm mt-2" style="width: 100%; justify-content: center; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b;" download>
                    <i class="fas fa-file-download"></i> Baixar Modelo
                </a>
            `;
        }

        html += `
        <div class="report-card ${sharedClass}">
            <span class="card-status-badge ${badgeClass}">${displayStatus}</span>
            <div class="card-icon"><i class="fas ${icon}"></i></div>
            ${sharedLabel}
            <div class="card-title">${r.report_type}</div>
            <div class="card-meta">
                ${r.description ? `<span>${r.description}</span><br>` : ''}
                Prazo: ${r.due_date ? new Date(r.due_date).toLocaleDateString() : 'Sem prazo'}<br>
                Versão: ${r.version > 0 ? 'v' + r.version : '-'}
                ${scheduledMsg}
            </div>
            <div class="card-actions">
                <div class="d-flex gap-2">
                    ${uploadButton}
                    ${eyeButton}
                </div>
                ${reportDownloadLink}
                ${templateLink}
            </div>
        </div>
    `;
    });
    container.innerHTML = html;
}
