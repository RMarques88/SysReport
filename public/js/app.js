// Helper to determine project root path dynamically
function getProjectBaseUrl() {
    const path = window.location.pathname;
    // Remove /public/... from the path
    const match = path.match(/^(.*?)\/public\//);
    if (match) {
        return match[1]; // Returns the base path before /public/
    }
    return '';
}

// Global State
let allUsers = [];
let allTypes = [];

document.addEventListener('DOMContentLoaded', () => {
    // LGPD Check
    if (!currentUser.lgpdAccepted) {
        document.getElementById('lgpdModal').style.display = 'block';
    }

    // Event Listeners
    if (document.getElementById('acceptLgpdBtn')) document.getElementById('acceptLgpdBtn').addEventListener('click', acceptLgpd);

    // Initial View
    loadView('dashboard');
});

// --- Navigation & Views ---

function loadView(viewName) {
    const mainContent = document.getElementById('main-content');

    // Update active link
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[onclick*="${viewName}"]`);
    if (activeLink) activeLink.classList.add('active');

    switch (viewName) {
        case 'superadmin_dashboard':
            if (currentUser.role === 'superadmin') loadSuperAdminDashboard();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'admin_stats':
            if (currentUser.role === 'admin') loadAdminStatsView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'reports':
        case 'dashboard':
            if (currentUser.role === 'admin') loadAdminDashboard();
            else if (currentUser.role === 'superadmin') loadSuperAdminDashboard();
            else loadUserDashboard();
            break;
        case 'users':
            if (currentUser.role === 'admin') loadUsersView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'admin_types':
            if (currentUser.role === 'admin') loadAdminTypesView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        case 'logs':
            if (currentUser.role === 'admin') loadLogsView();
            else mainContent.innerHTML = '<p class="text-danger">Acesso negado.</p>';
            break;
        default:
            mainContent.innerHTML = '<h2>Página não encontrada</h2>';
    }
}

// --- Admin Dashboard (Assignments & Tracking) ---

async function loadAdminDashboard() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Painel de Controle</h2>
            <button class="btn btn-primary" onclick="openAssignmentModal()"><i class="fas fa-plus-circle"></i> Nova Solicitação de Relatório</button>
        </div>
        
        <div class="card" style="margin-bottom: 2rem;">
            <div class="card-body d-flex gap-2 align-center" style="flex-wrap: wrap;">
                <strong>Filtros:</strong>
                <input type="text" id="filterSearch" class="form-control" placeholder="Buscar por nome..." style="width: 200px;" onkeyup="renderAdminReportsTable()">
                <select id="filterStatus" class="form-control" style="width: 200px;" onchange="fetchAdminReports()">
                    <option value="">Todos os Status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="SUBMITTED">Enviado</option>
                    <option value="APPROVED">Aprovado</option>
                    <option value="REJECTED">Rejeitado</option>
                </select>
                <select id="filterUser" class="form-control" style="width: 200px;" onchange="fetchAdminReports()">
                    <option value="">Todos os Usuários</option>
                </select>
                <button class="btn btn-secondary" onclick="fetchAdminReports()"><i class="fas fa-sync"></i> Atualizar</button>
            </div>
        </div>

        <div id="adminReportsTable">Carregando...</div>
    `;

    // Load filter options
    await loadUsersForFilter();
    fetchAdminReports();
}

async function loadUsersForFilter() {
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php');
        allUsers = await response.json();
        const select = document.getElementById('filterUser');
        if (select) {
            allUsers.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.username;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

async function fetchAdminReports() {
    const container = document.getElementById('adminReportsTable');
    if (!container) return; // Guard

    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando relatórios...</div>';

    const search = document.getElementById('filterSearch') ? document.getElementById('filterSearch').value.toLowerCase() : '';
    const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
    const userFilter = document.getElementById('filterUser') ? document.getElementById('filterUser').value : '';

    try {
        let url = getProjectBaseUrl() + '/src/api/reports.php?admin=true';
        if (statusFilter && statusFilter !== 'Todos os Status') url += `&status=${statusFilter}`;
        if (userFilter) url += `&user_id=${userFilter}`;

        const response = await fetch(url);
        let reports = await response.json();

        // Store for global access/filtering if needed, though we filter here directly mostly
        window.allAdminReports = reports;

        // Client-side filtering logic for "Hide Future Pending"
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

        reports = reports.map(r => ({
            ...r,
            status: (r.status || 'PENDING').toUpperCase()
        })).filter(r => {
            // Search Filter
            if (search && !r.report_type.toLowerCase().includes(search) && !r.owner_name.toLowerCase().includes(search)) return false;

            // Hide Future Pending (Recurring Logic)
            if (r.status === 'PENDING' && r.due_date) {
                const dueDate = new Date(r.due_date);
                if (!isNaN(dueDate) && dueDate > tenDaysFromNow) return false;
            }
            return true;
        });

        renderAdminReportsTable(reports);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger">Erro ao carregar relatórios.</p>';
    }
}

function renderAdminReportsTable(reports) {
    const container = document.getElementById('adminReportsTable');
    if (!container) return;

    if (!reports || reports.length === 0) {
        container.innerHTML = '<div class="card"><div class="card-body text-center text-muted">Nenhum relatório encontrado.</div></div>';
        return;
    }

    let html = `
        <div class="card">
            <table class="table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Relatório</th>
                        <th>Usuário</th>
                        <th>Versão</th>
                        <th>Data Atribuição/Envio</th>
                        <th>Prazo</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    reports.forEach(r => {
        let badgeClass = 'badge-pending';
        if (r.status === 'SUBMITTED') badgeClass = 'badge-submitted';
        if (r.status === 'APPROVED') badgeClass = 'badge-approved';
        if (r.status === 'REJECTED') badgeClass = 'badge-rejected';

        html += `
            <tr>
                <td><span class="badge ${badgeClass}">${TRANSLATE_STATUS[r.status] || r.status}</span></td>
                <td>
                    <strong>${r.report_type}</strong><br>
                    ${r.original_filename ? `<small class="text-muted"><i class="fas fa-paperclip"></i> ${r.original_filename}</small>` : '<small class="text-muted">Aguardando envio</small>'}
                </td>
                <td>${r.owner_name}</td>
                <td>${r.version > 0 ? 'v' + r.version : '-'}</td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td>${r.due_date ? new Date(r.due_date).toLocaleDateString() : '-'}</td>
                <td>
                        <button class="btn btn-sm btn-primary" onclick="openEditReportModal('${r.id}', '${r.due_date}', '${r.recurrence_days || ''}', '${r.description || ''}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-secondary" onclick="openHistoryModal('${r.group_id}', '${r.report_type}')" title="Histórico de Versões"><i class="fas fa-history"></i></button> 
                        <button class="btn btn-sm btn-warning" onclick="openShareModal('${r.id}', '${r.original_filename || r.report_type}')" title="Permissões de Acesso"><i class="fas fa-share-alt"></i></button>
                        ${r.status !== 'PENDING' ? `
                        <button class="btn btn-sm btn-info" onclick="previewReport('${r.file_path}', '${r.original_filename}')" title="Visualizar"><i class="fas fa-eye"></i></button>
                        <a href="${getProjectBaseUrl()}/uploads/${r.file_path}" class="btn btn-sm btn-success" download="${r.original_filename}" title="Baixar"><i class="fas fa-download"></i></a>
                        ${r.status === 'SUBMITTED' || r.status === 'APPROVED' ? `<button class="btn btn-sm btn-danger" style="background:#ef4444; border:none;" onclick="rejectReport('${r.id}')" title="Rejeitar"><i class="fas fa-ban"></i></button>` : ''}
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteReport('${r.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// History & Reject Functions

async function rejectReport(id) {
    const { value: reason } = await Swal.fire({
        title: 'Rejeitar Relatório',
        text: 'Informe o motivo da rejeição (opcional):',
        input: 'text',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Rejeitar',
        cancelButtonText: 'Cancelar'
    });

    if (reason === undefined) return; // Cancelled

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: 'REJECTED', reason: reason })
        });
        const res = await response.json();
        if (res.success) {
            fetchAdminReports();
            Swal.fire('Rejeitado', 'Status atualizado para Rejeitado.', 'success');
        } else {
            Swal.fire('Erro', res.error || 'Erro ao rejeitar.', 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro na requisição.', 'error'); }
}

async function openHistoryModal(groupId, reportName) {
    if (!document.getElementById('historyModal')) {
        const modalHtml = `
        <div id="historyModal" class="modal">
            <div class="modal-content" style="max-width:800px;">
                <span class="close" onclick="document.getElementById('historyModal').style.display='none'">&times;</span>
                <h2>Histórico: ${reportName}</h2>
                <div id="historyContent">Carregando...</div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('historyModal').style.display = 'block';
    const container = document.getElementById('historyContent');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(getProjectBaseUrl() + `/src/api/reports.php?action=history&group_id=${groupId}`);
        const history = await res.json();

        if (history.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum histórico encontrado.</p>';
            return;
        }

        let html = `
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>Versão</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Arquivo</th>
                    <th>Enviado por</th>
                </tr>
            </thead>
            <tbody>`;

        history.forEach(h => {
            html += `
            <tr>
                <td>v${h.version}</td>
                <td>${new Date(h.created_at).toLocaleString()}</td>
                <td><span class="badge ${h.status === 'SUBMITTED' ? 'badge-submitted' : (h.status === 'APPROVED' ? 'badge-approved' : 'badge-pending')}">${TRANSLATE_STATUS[h.status] || h.status}</span></td>
                <td>${h.file_path ? `<a href="${getProjectBaseUrl()}/uploads/${h.file_path}" target="_blank" class="text-blue-600"><i class="fas fa-download"></i> Baixar</a>` : '-'}</td>
                    <td>${h.owner_name}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;


    } catch (e) {
        container.innerHTML = '<p class="text-danger">Erro ao carregar histórico.</p>';
    }
}

// --- Sharing Logic ---

let shareSelectedUsers = [];

async function openShareModal(reportId, reportName) {
    shareSelectedUsers = [];
    const existing = document.getElementById('shareModalAdmin');
    if (existing) existing.remove();

    // Ensure users are loaded
    if (!window.allUsers || window.allUsers.length === 0) {
        try {
            const res = await fetch(getProjectBaseUrl() + '/src/api/users.php');
            window.allUsers = await res.json();
        } catch (e) { console.error("Error loading users for share", e); }
    }

    const modalHtml = `
        <div id="shareModalAdmin" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="document.getElementById('shareModalAdmin').style.display='none'">&times;</span>
                <div style="border-bottom: 1px solid #eee; margin-bottom: 1.5rem; padding-bottom: 0.5rem;">
                    <h2>Permissões de Acesso</h2>
                    <p class="text-muted" style="margin-top: 0.5rem;">Gerencie quem pode visualizar: <strong>${reportName}</strong></p>
                </div>
                
                <form id="shareFormAdmin" onsubmit="return false;">
                    <input type="hidden" id="shareReportId" value="${reportId}">
                    
                    <div class="form-group" style="position: relative;">
                        <label>Adicionar Usuário</label>
                        <div class="d-flex align-center gap-2">
                             <div style="position: relative; flex: 1;">
                                <input type="text" class="form-control" id="shareUserInput" placeholder="Digite o nome do usuário para adicionar..." autocomplete="off">
                                <div id="shareUserSuggestions" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 2000; max-height: 200px; overflow-y: auto; display: none;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <h4 style="margin-top: 2rem; margin-bottom: 1rem; font-size: 0.95rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Acesso Permitido Atual</h4>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; max-height: 300px; overflow-y: auto;">
                        <ul id="sharedUsersListAdmin" style="list-style: none; padding: 0; margin: 0;">
                            <li style="padding: 2rem; text-align: center; color: var(--text-muted);">Carregando...</li>
                        </ul>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('shareModalAdmin').style.display = 'block';

    // Bind Search
    document.getElementById('shareUserInput').addEventListener('keyup', handleShareUserSearch);

    // Load Existing Shares
    await loadExistingShares(reportId);
}

async function loadExistingShares(reportId) {
    const list = document.getElementById('sharedUsersListAdmin');
    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/shares.php?report_id=' + reportId);
        const users = await res.json();
        list.innerHTML = '';
        if (users.length === 0) {
            list.innerHTML = '<li style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhum usuário tem acesso extra a este arquivo.</li>';
        }
        users.forEach(u => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '1rem';
            li.style.borderBottom = '1px solid #f1f5f9';
            li.innerHTML = `
                <div class="d-flex align-center gap-2">
                    <div style="width: 32px; height: 32px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${u.username.substring(0, 1).toUpperCase()}
                    </div>
                    <span style="font-weight: 500;">${u.username}</span>
                </div>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeShare('${reportId}', '${u.id}')" title="Remover Acesso"><i class="fas fa-trash"></i></button>
            `;
            list.appendChild(li);
        });
    } catch (e) { list.innerHTML = '<li style="padding: 1rem; color: var(--danger-color);">Erro ao carregar lista.</li>'; }
}


function handleShareUserSearch(e) {
    const term = e.target.value.toLowerCase();
    const suggestionsBox = document.getElementById('shareUserSuggestions');
    suggestionsBox.innerHTML = '';

    if (term.length < 1) {
        suggestionsBox.style.display = 'none';
        return;
    }

    const matches = (window.allUsers || []).filter(u =>
        u.username.toLowerCase().includes(term) &&
        !shareSelectedUsers.find(s => s.id == u.id)
    );

    if (matches.length > 0) {
        suggestionsBox.style.display = 'block';
        matches.forEach(u => {
            // Exclude already added visual check if needed, but simplified: allow clicking, if already added logic handles it or backend ignores duplicate
            const div = document.createElement('div');
            div.style.padding = '0.75rem 1rem';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #f1f5f9';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '0.75rem';
            div.innerHTML = `
                <div style="width: 24px; height: 24px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">
                    ${u.username.substring(0, 1).toUpperCase()}
                </div>
                <span>${u.username}</span>
            `;
            div.onmouseover = () => div.style.background = '#f8fafc';
            div.onmouseout = () => div.style.background = 'white';
            div.onclick = () => saveShareImmediate(u.id);
            suggestionsBox.appendChild(div);
        });
    } else {
        suggestionsBox.style.display = 'none';
    }
}

async function saveShareImmediate(userId) {
    const reportId = document.getElementById('shareReportId').value;
    document.getElementById('shareUserInput').value = '';
    document.getElementById('shareUserSuggestions').style.display = 'none';

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/shares.php', {
            method: 'POST',
            body: JSON.stringify({ report_id: reportId, user_ids: [userId] })
        });
        await loadExistingShares(reportId);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Permissão adicionada',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (e) { Swal.fire('Erro', 'Erro ao adicionar permissão.', 'error'); }
}

async function removeShare(reportId, userId) {
    const result = await Swal.fire({
        title: 'Remover acesso?',
        text: "O usuário perderá a visualização deste arquivo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, remover',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        await fetch(getProjectBaseUrl() + `/src/api/shares.php?report_id=${reportId}&user_id=${userId}`, { method: 'DELETE' });
        loadExistingShares(reportId);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Acesso removido',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (e) { Swal.fire('Erro', 'Erro ao remover.', 'error'); }
}

// --- Report Edit/Delete Logic ---

function openEditReportModal(id, dueDate, recurrence, desc) {
    document.getElementById('editReportId').value = id;
    document.getElementById('editReportDue').value = dueDate && dueDate !== 'null' ? dueDate.split(' ')[0] : '';
    document.getElementById('editReportRecur').value = recurrence && recurrence !== 'null' ? recurrence : '';
    document.getElementById('editReportDesc').value = desc && desc !== 'null' ? desc : '';
    document.getElementById('editReportModal').style.display = 'block';
}

async function handleEditReport(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php', {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        const res = await response.json();
        if (res.success) {
            document.getElementById('editReportModal').style.display = 'none';
            fetchAdminReports();
            Swal.fire('Sucesso', 'Atualizado com sucesso!', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro ao atualizar', 'error'); }
}

async function deleteReport(id) {
    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: "Deseja excluir esta solicitação? Esta ação é irreversível.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php?id=' + id, { method: 'DELETE' });
        const res = await response.json();
        if (res.success) {
            fetchAdminReports();
            Swal.fire('Deletado!', 'O relatório foi excluído.', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro ao excluir', 'error'); }
}

// --- User Dashboard (Cards) ---

async function loadUserDashboard() {
    const mainContent = document.getElementById('main-content');
    // Ensure styles for user dashboard
    const style = document.createElement('style');
    style.innerHTML = `
        .user-dashboard-container { padding: 20px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .filters-container { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-input { padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .report-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: transform 0.2s; position: relative; overflow: hidden; }
        .report-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .card-status-badge { position: absolute; top: 15px; right: 15px; padding: 5px 10px; border-radius: 20px; font-size: 0.8em; font-weight: bold; }
        .status-pending { background: #fef9c3; color: #854d0e; }
        .status-submitted { background: #dbeafe; color: #1e40af; }
        .status-approved { background: #dcfce7; color: #166534; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .card-icon { font-size: 2em; color: #3b82f6; margin-bottom: 15px; }
        .card-title { font-size: 1.1em; font-weight: 600; color: #1f2937; margin-bottom: 5px; }
        .card-meta { color: #6b7280; font-size: 0.9em; margin-bottom: 15px; }
        .card-actions { display: flex; gap: 10px; margin-top: auto; }
        /* Shared Reports Style */
        .report-card.shared { border-left: 5px solid #8b5cf6; background: #fdfbff; }
        .report-card.shared .card-icon { color: #c4b5fd; }
    `;
    document.head.appendChild(style);

    mainContent.innerHTML = `
        <div class="user-dashboard-container">
            <div class="dashboard-header">
                <h2>Meus Relatórios</h2>
            </div>
            
            <div class="filters-container">
                <input type="text" id="userFilterSearch" class="filter-input" placeholder="Buscar relatório..." onkeyup="renderUserReports()">
                <select id="userFilterStatus" class="filter-input" onchange="renderUserReports()">
                    <option value="">Todos os Status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="SUBMITTED">Enviado</option>
                    <option value="APPROVED">Aprovado</option>
                    <option value="REJECTED">Rejeitado</option>
                </select>
                <select id="userFilterSource" class="filter-input" onchange="renderUserReports()">
                    <option value="">Todos (Origem)</option>
                    <option value="mine">Meus Relatórios</option>
                    <option value="shared">Compartilhados Comigo</option>
                </select>
                <select id="userFilterType" class="filter-input" onchange="renderUserReports()">
                    <option value="">Todos os Tipos</option>
                </select>
            </div>

            <div id="userReportsGrid" class="reports-grid">
                <!-- Cards will be injected here -->
            </div>
        </div>
    `;

    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/reports.php');
        window.allUserReports = await res.json();

        // Populate Types Filter
        populateUserTypeFilter();

        renderUserReports();
    } catch (e) {
        console.error("Error loading user reports", e);
        Swal.fire('Erro', 'Erro ao carregar relatórios.', 'error');
    }
}

// --- Status Translation ---
const TRANSLATE_STATUS = {
    'PENDING': 'Pendente',
    'SUBMITTED': 'Enviado',
    'APPROVED': 'Aprovado',
    'REJECTED': 'Rejeitado'
};

function populateUserTypeFilter() {
    const select = document.getElementById('userFilterType');
    if (!select) return;
    const types = new Set();
    (window.allUserReports || []).forEach(r => types.add(r.report_type));
    select.innerHTML = '<option value="">Todos os Tipos</option>';
    types.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
    });
}

function renderUserReports() {
    const container = document.getElementById('userReportsGrid');
    if (!container) return;
    const search = document.getElementById('userFilterSearch') ? document.getElementById('userFilterSearch').value.toLowerCase() : '';
    const statusFilter = document.getElementById('userFilterStatus') ? document.getElementById('userFilterStatus').value : '';
    const sourceFilter = document.getElementById('userFilterSource') ? document.getElementById('userFilterSource').value : '';
    const typeFilter = document.getElementById('userFilterType') ? document.getElementById('userFilterType').value : '';

    let reports = window.allUserReports || [];

    // Pre-process reports to normalize data
    reports = reports.map(r => ({
        ...r,
        // Ensure status is uppercase and defaults to PENDING if missing
        status: (r.status || 'PENDING').toUpperCase(),
        // Ensure is_shared is a proper boolean
        isShared: (r.is_shared == 1 || r.is_shared === '1' || r.is_shared === true)
    }));

    // Debugging (visible in console)
    console.log("All Reports (Normalized):", reports);

    // Filter
    if (search) reports = reports.filter(r => r.report_type.toLowerCase().includes(search));

    // Status Filter: Compare against normalized status
    if (statusFilter) reports = reports.filter(r => r.status === statusFilter);

    // Type Filter
    if (typeFilter) reports = reports.filter(r => r.report_type === typeFilter);

    // Source Filter
    if (sourceFilter) {
        if (sourceFilter === 'mine') {
            reports = reports.filter(r => !r.isShared);
        } else if (sourceFilter === 'shared') {
            reports = reports.filter(r => r.isShared);
        }
    }

    // Hide Pending Future Reports (ONLY for OWNED reports)
    // Rule: If I own it, and it's PENDING, and it's due > 10 days from now -> Hide it.
    // Shared reports bypass this (always visible).
    const now = new Date();
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(now.getDate() + 10);
    // Reset time part to ensure clean date comparison if needed, or keep precise.

    reports = reports.filter(r => {
        if (r.isShared) return true; // Always show shared reports

        if (r.status === 'PENDING' && r.due_date) {
            // Check if due date is valid
            const dueDate = new Date(r.due_date);
            if (!isNaN(dueDate) && dueDate > tenDaysFromNow) {
                return false; // Hide it
            }
        }
        return true;
    });

    if (reports.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">Nenhum relatório encontrado.</div>';
        return;
    }

    let html = '';
    reports.forEach(r => {
        const { status, isShared } = r;

        let badgeClass = '';
        let icon = '';

        switch (status) {
            case 'PENDING': badgeClass = 'badge-pending'; icon = 'fa-clock'; break;
            case 'SUBMITTED': badgeClass = 'badge-submitted'; icon = 'fa-check-circle'; break;
            case 'APPROVED': badgeClass = 'badge-approved'; icon = 'fa-check-double'; break;
            case 'REJECTED': badgeClass = 'badge-rejected'; icon = 'fa-times-circle'; break;
            default: badgeClass = 'badge-secondary'; icon = 'fa-question';
        }

        const sharedClass = isShared ? 'shared-card' : '';
        const sharedLabel = isShared ? `<div class="shared-label"><i class="fas fa-share-alt"></i> Compartilhado de ${r.owner_name || 'Alguém'}</div>` : '';

        // Template Download Link
        let templateLink = '';
        if (r.template_path) {
            let path = r.template_path;
            if (path.startsWith('templates/')) {
                path = 'uploads/' + path;
            } else if (path.startsWith('src/uploads/')) {
                path = path.replace('src/uploads/', 'uploads/');
            }
            templateLink = `<br><a href="${getProjectBaseUrl()}/${path}" target="_blank" class="text-xs text-blue-500 hover:underline"><i class="fas fa-download"></i> Baixar Modelo</a>`;
        }

        let reportDownloadLink = '';
        if (r.file_path && status !== 'PENDING') {
            let path = r.file_path;
            // Legacy/Standard Check: If path doesn't start with 'uploads/', assume it's just filename in root uploads dir
            if (!path.startsWith('uploads/') && !path.startsWith('src/')) {
                path = 'uploads/' + path;
            }
            reportDownloadLink = `<a href="${getProjectBaseUrl()}/${path}" target="_blank" class="btn btn-sm btn-outline-secondary w-100 mb-2"><i class="fas fa-download"></i> Baixar Enviado</a>`;
        }

        // Upload/Re-upload Button (Only if NOT shared)
        // If status is PENDING -> "Enviar"
        // If status is SUBMITTED/REJECTED -> "Reenviar"
        // If status is APPROVED -> Typically no action, or re-upload if allowed? Assuming Reenviar is fine.
        const btnLabel = status === 'PENDING' ? 'Enviar' : 'Reenviar';

        const uploadButton = !isShared ? `
            <button class="btn btn-primary btn-sm w-100" onclick="openUploadModal('${r.id}', '${r.report_type}', '${status}')">
                <i class="fas fa-upload"></i> ${btnLabel}
            </button>` : '';

        html += `
        <div class="report-card ${sharedClass}">
            <span class="card-status-badge ${badgeClass}">${TRANSLATE_STATUS[status] || 'Pendente'}</span>
            <div class="card-icon"><i class="fas ${icon}"></i></div>
            ${sharedLabel}
            <div class="card-title">${r.report_type}</div>
            <div class="card-meta">
                Prazo: ${r.due_date ? new Date(r.due_date).toLocaleDateString() : 'Sem prazo'}<br>
                Versão: ${r.version > 0 ? 'v' + r.version : '-'}
            </div>
            
            <div class="card-actions">
                ${uploadButton}
                ${reportDownloadLink}
                ${templateLink}
            </div>
        </div>
    `;
    });
    container.innerHTML = html;
}

// --- Assignment Logic (Admin) ---

let assignmentSelectedUsers = [];

async function openAssignmentModal() {
    assignmentSelectedUsers = [];
    const existing = document.getElementById('assignmentModal');
    if (existing) existing.remove();

    if (!window.allUsers || window.allUsers.length === 0) {
        try {
            const res = await fetch(getProjectBaseUrl() + '/src/api/users.php');
            window.allUsers = await res.json();
        } catch (e) { console.error("Error loading users for assignment", e); }
    }

    const modalHtml = `
        <div id="assignmentModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('assignmentModal').style.display='none'">&times;</span>
                <h2>Nova Solicitação</h2>
                <form id="assignmentForm">
                    <div class="form-group">
                        <label>Tipo de Relatório</label>
                        <select class="form-control" name="report_type_id" required id="assignTypeSelect"></select>
                    </div>

                    <div class="form-group">
                        <label>Usuários (Digite para buscar)</label>
                        <div style="position: relative;">
                            <input type="text" class="form-control" id="userAutocompleteInput" placeholder="Digite o nome do usuário..." autocomplete="off">
                                <div id="userSuggestions" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; z-index: 10; max-height: 150px; overflow-y: auto; display: none;"></div>
                        </div>
                        <ul id="selectedUsersList" style="list-style: none; padding: 0; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px;"></ul>
                    </div>

                    <div class="form-group">
                        <label>Prazo (Opcional)</label>
                        <input type="date" class="form-control" name="due_date">
                    </div>
                    <div class="form-group">
                        <label>Recorrência (Dias) - Opcional</label>
                        <input type="number" class="form-control" name="recurrence_days" placeholder="Ex: 30 para mensal">
                    </div>

                    <div class="form-group">
                        <label>Modelo de Arquivo (Template) - Opcional</label>
                        <input type="file" class="form-control" name="template_file" accept=".xls,.xlsx,.doc,.docx,.pdf,.txt">
                            <small class="text-muted">Usuários poderão baixar este arquivo como base.</small>
                    </div>

                    <div class="form-group">
                        <label>Instruções (Opcional)</label>
                        <textarea class="form-control" name="description"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary mt-4">Criar Solicitação</button>
                </form>
            </div>
        </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('assignmentModal').style.display = 'block';

    // Populate Types
    const typeSelect = document.getElementById('assignTypeSelect');
    try {
        const types = await (await fetch(getProjectBaseUrl() + '/src/api/admin_report_types.php')).json();
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            typeSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading types", e);
    }

    // Bind Autocomplete Events
    const input = document.getElementById('userAutocompleteInput');
    input.addEventListener('keyup', handleUserSearch);
    document.getElementById('assignmentForm').addEventListener('submit', handleCreateAssignment);
}

function handleUserSearch(e) {
    const term = e.target.value.toLowerCase();
    const suggestionsBox = document.getElementById('userSuggestions');
    suggestionsBox.innerHTML = '';

    if (term.length < 1) {
        suggestionsBox.style.display = 'none';
        return;
    }

    // Filter Global allUsers (loaded in dashboard) or fetch? 
    // Assuming allUsers is available from loadAdminDashboard or loadUsersForFilter
    const matches = (window.allUsers || []).filter(u =>
        u.username.toLowerCase().includes(term) &&
        !assignmentSelectedUsers.find(s => s.id == u.id)
    );

    if (matches.length > 0) {
        suggestionsBox.style.display = 'block';
        matches.forEach(u => {
            const div = document.createElement('div');
            div.style.padding = '8px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #eee';
            div.textContent = u.username;
            div.onmouseover = () => div.style.background = '#f0f0f0';
            div.onmouseout = () => div.style.background = 'white';
            div.onclick = () => selectUserForAssignment(u);
            suggestionsBox.appendChild(div);
        });
    } else {
        suggestionsBox.style.display = 'none';
    }
}

function selectUserForAssignment(user) {
    assignmentSelectedUsers.push(user);
    renderSelectedUsers();
    document.getElementById('userAutocompleteInput').value = '';
    document.getElementById('userSuggestions').style.display = 'none';
}

function removeUserFromAssignment(userId) {
    assignmentSelectedUsers = assignmentSelectedUsers.filter(u => u.id != userId);
    renderSelectedUsers();
}

function renderSelectedUsers() {
    const list = document.getElementById('selectedUsersList');
    list.innerHTML = '';
    assignmentSelectedUsers.forEach(u => {
        const li = document.createElement('li');
        li.style.background = '#e2e8f0';
        li.style.padding = '5px 10px';
        li.style.borderRadius = '15px';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.innerHTML = `
            ${u.username}
    <i class="fas fa-trash" style="cursor: pointer; color: #ef4444;" onclick="removeUserFromAssignment('${u.id}')"></i>
    `;
        list.appendChild(li);
    });
}

async function handleCreateAssignment(e) {
    e.preventDefault();
    if (assignmentSelectedUsers.length === 0) {
        Swal.fire('Atenção', 'Selecione pelo menos um usuário.', 'warning');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);

    // Add Users JSON
    const userIds = assignmentSelectedUsers.map(u => u.id);
    formData.append('user_ids', JSON.stringify(userIds));

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php', {
            method: 'POST',
            body: formData // Fetch handles Content-Type for FormData
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('assignmentModal').style.display = 'none';
            fetchAdminReports();
            Swal.fire('Sucesso', result.message, 'success');
        } else {
            Swal.fire('Erro', result.message, 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Erro ao criar solicitação.', 'error');
        console.error(e);
    }
}


// --- Upload (User) ---

async function openUploadModal(reportId, reportName, status = 'PENDING') {
    if (status === 'SUBMITTED') {
        const result = await Swal.fire({
            title: 'Atenção',
            text: "Já existe um arquivo enviado. Deseja enviar uma nova versão e substituir o anterior?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, substituir',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
    }

    // Remove existing modal to avoid stale state
    const existing = document.getElementById('uploadModal');
    if (existing) existing.remove();

    const modalHtml = `
        < div id = "uploadModal" class="modal" >
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('uploadModal').style.display='none'">&times;</span>
                <h2>Enviar Relatório</h2>
                <p id="uploadReportName" class="text-muted"></p>
                <form id="uploadForm">
                    <input type="hidden" name="report_id" id="uploadReportId">
                        <div class="form-group">
                            <label>Selecione o arquivo (XLS/XLSX)</label>
                            <input type="file" class="form-control" name="file" accept=".xls,.xlsx" required>
                        </div>
                        <button type="submit" class="btn btn-primary mt-4">Enviar Arquivo</button>
                </form>
            </div>
        </div >
        `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind Event
    document.getElementById('uploadForm').addEventListener('submit', handleUploadById);

    // Set Data
    document.getElementById('uploadReportId').value = reportId;
    document.getElementById('uploadReportName').textContent = 'Para: ' + reportName; // reportName usually safe to textContent
    document.getElementById('uploadModal').style.display = 'block';
}

async function handleUploadById(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/upload.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('uploadModal').style.display = 'none';
            loadUserDashboard(); // Refresh cards
            Swal.fire('Sucesso', 'Arquivo enviado com sucesso!', 'success');
        } else {
            Swal.fire('Erro', result.message, 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Erro ao enviar', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Arquivo';
    }
}


// --- Admin: Report Types (CRUD) ---

async function loadAdminTypesView() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Tipos de Relatório</h2>
            <button class="btn btn-success" onclick="openTypeModal()"><i class="fas fa-plus"></i> Novo Tipo</button>
        </div>
        <div id="typesTableContainer">Carregando...</div>
    `;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/admin_report_types.php');
        const types = await response.json();

        let html = `
        <div class="card">
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    `;

        if (types.length === 0) html += '<tr><td colspan="3" class="text-center">Nenhum tipo cadastrado.</td></tr>';
        else {
            types.forEach(t => {
                html += `
                    <tr>
                        <td>${t.name}</td>
                        <td>${t.description}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="openTypeModal('${t.id}', '${t.name}', '${t.description}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="deleteType('${t.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        html += '</tbody></table></div>';
        document.getElementById('typesTableContainer').innerHTML = html;

        // Modal Init
        if (!document.getElementById('typeModal')) {
            const modalHtml = `
                <div id="typeModal" class="modal">
                    <div class="modal-content">
                        <span class="close" onclick="document.getElementById('typeModal').style.display='none'">&times;</span>
                        <h2 id="typeModalTitle">Novo Tipo</h2>
                        <form id="typeForm">
                            <input type="hidden" name="id" id="typeId">
                            <div class="form-group">
                                <label>Nome</label>
                                <input type="text" class="form-control" name="name" id="typeName" required>
                            </div>
                            <div class="form-group">
                                <label>Descrição</label>
                                <textarea class="form-control" name="description" id="typeDesc"></textarea>
                            </div>
                            <button type="submit" class="btn btn-success mt-4">Salvar</button>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('typeForm').addEventListener('submit', handleSaveType);
        }

    } catch (e) {
        console.error(e);
        document.getElementById('typesTableContainer').innerHTML = '<p class="text-danger">Erro ao carregar.</p>';
    }
}

function openTypeModal(id = '', name = '', desc = '') {
    document.getElementById('typeId').value = id;
    document.getElementById('typeName').value = name;
    document.getElementById('typeDesc').value = desc;
    document.getElementById('typeModalTitle').textContent = id ? 'Editar Tipo' : 'Novo Tipo';
    document.getElementById('typeModal').style.display = 'block';
}

async function handleSaveType(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/admin_report_types.php', {
            method: 'POST',
            body: formData
        });
        const res = await response.json();
        if (res.success) {
            document.getElementById('typeModal').style.display = 'none';
            loadAdminTypesView();
            Swal.fire('Sucesso', 'Salvo com sucesso!', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro na requisição', 'error'); }
}

async function deleteType(id) {
    const result = await Swal.fire({
        title: 'Excluir Tipo?',
        text: "Esta ação não pode ser desfeita.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/admin_report_types.php?id=' + id, { method: 'DELETE' });
        const res = await response.json();
        if (res.success) {
            loadAdminTypesView();
            Swal.fire('Deletado!', 'Tipo excluído.', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro ao excluir', 'error'); }
}


// --- Users management, Logs, LGPD, Preview (Keeping simplified or reusing existing logic adapted) ---
// (Re-implementing essential parts for completeness)


async function loadUsersView() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando usuários...</div>';

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php');
        const users = await response.json();

        let html = `
            <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
                <h2>Gerenciar Usuários</h2>
                <button class="btn btn-success" onclick="openUserModal()"><i class="fas fa-plus"></i> Novo Usuário</button>
            </div>
            
            <div class="card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Função</th>
                            <th>Criado em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (users.length === 0) {
            html += '<tr><td colspan="4" class="text-center text-muted">Nenhum usuário encontrado.</td></tr>';
        } else {
            users.forEach(u => {
                html += `
                    <tr>
                        <td>
                            <div class="d-flex align-center gap-2">
                                <div style="width:32px; height:32px; background: #e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; color: var(--text-muted);">
                                    <i class="fas fa-user"></i>
                                </div>
                                <strong>${u.username}</strong>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${u.role === 'admin' ? 'badge-approved' : 'badge-submitted'}">${u.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                        </td>
                        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="openUserModal(${u.id}, '${u.username}', '${u.email || ''}', '${u.role}')" title="Editar"><i class="fas fa-edit"></i></button>
                            ${u.id != currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                        </td>
                    </tr>
                `;
            });
        }

        html += '</tbody></table></div>';
        mainContent.innerHTML = html;

        // Ensure Modal Exists
        if (!document.getElementById('userModal')) {
            const modalHtml = `
                <div id="userModal" class="modal">
                    <div class="modal-content">
                        <span class="close" onclick="document.getElementById('userModal').style.display='none'">&times;</span>
                        <h2 id="userModalTitle">Novo Usuário</h2>
                        <form id="userForm">
                            <input type="hidden" id="userId" name="id">
                            <div class="form-group">
                                <label>Nome de Usuário</label>
                                <input type="text" class="form-control" id="username" name="username" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" class="form-control" id="email" name="email">
                            </div>
                            <div class="form-group">
                                <label>Senha <small class="text-muted">(Deixe em branco p/ manter atual)</small></label>
                                <input type="password" class="form-control" id="password" name="password">
                            </div>
                            <div class="form-group">
                                <label>Função</label>
                                <select class="form-control" id="role" name="role">
                                    <option value="user">Usuário Comum</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-success mt-4">Salvar Usuário</button>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('userForm').addEventListener('submit', handleSaveUser);
        }

    } catch (error) {
        console.error(error);
        mainContent.innerHTML = '<p class="text-danger">Erro ao carregar usuários.</p>';
    }
}

async function loadLogsView() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Logs do Sistema</h2>
            <button class="btn btn-secondary" onclick="loadLogsView()"><i class="fas fa-sync"></i> Atualizar</button>
        </div>
        <div id="logsTableContainer">Carregando logs...</div>
    `;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/logs.php');
        const logs = await response.json();

        let html = `
            <div class="card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Usuário</th>
                            <th>Ação</th>
                            <th>Detalhes</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (logs.length === 0) {
            html += '<tr><td colspan="5" class="text-center">Nenhum registro encontrado.</td></tr>';
        } else {
            logs.forEach(l => {
                html += `
                    <tr>
                        <td>${new Date(l.created_at).toLocaleString()}</td>
                        <td>${l.username || 'Sistema/Desconhecido'}</td>
                        <td><span class="badge badge-approved" style="background: #e2e8f0; color: #475569;">${l.action}</span></td>
                        <td>${l.details}</td>
                        <td>${l.ip_address}</td>
                    </tr>
                `;
            });
        }

        html += '</tbody></table></div>';
        document.getElementById('logsTableContainer').innerHTML = html;

    } catch (e) {
        console.error(e);
        document.getElementById('logsTableContainer').innerHTML = '<p class="text-danger">Erro ao carregar logs.</p>';
    }
}

// Preview Logic
async function previewReport(filename, originalName) {
    if (!document.getElementById('previewModal')) {
        const modalHtml = `
            <div id="previewModal" class="modal">
                <div class="modal-content" style="width: 80%;">
                    <span class="close" onclick="document.getElementById('previewModal').style.display='none'">&times;</span>
                    <h2 id="previewTitle"></h2>
                    <div id="previewContent" style="overflow-x:auto;"></div>
                </div>
            </div>
         `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    document.getElementById('previewTitle').textContent = originalName;
    content.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    modal.style.display = 'block';

    const url = getProjectBaseUrl() + '/uploads/' + filename;

    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const html = XLSX.utils.sheet_to_html(worksheet, { class: 'table table-striped' });
        content.innerHTML = html;
    } catch (e) {
        content.innerHTML = '<p class="text-danger">Erro ao carregar preview.</p>';
    }
}


// --- User CRUD Implementation ---

function openUserModal(id = '', username = '', email = '', role = 'user') {
    document.getElementById('userId').value = id;
    document.getElementById('username').value = username;
    document.getElementById('email').value = email;
    document.getElementById('password').value = ''; // Reset password field
    document.getElementById('role').value = role;

    document.getElementById('userModalTitle').textContent = id ? 'Editar Usuário' : 'Novo Usuário';
    document.getElementById('userModal').style.display = 'block';
}

async function handleSaveUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Convert to JSON

    try {
        const method = data.id ? 'PUT' : 'POST';
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success || (result.id)) { // POST returns id
            document.getElementById('userModal').style.display = 'none';
            loadUsersView();
            Swal.fire('Sucesso', 'Usuário salvo com sucesso!', 'success');
        } else {
            Swal.fire('Erro', (result.error || 'Erro desconhecido'), 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Erro de conexão.', 'error');
    }
}

async function deleteUser(id) {
    const result = await Swal.fire({
        title: 'Excluir Usuário?',
        text: "Tem certeza que deseja excluir este usuário?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php?id=' + id, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            loadUsersView();
            Swal.fire('Deletado', 'Usuário excluído.', 'success');
        } else {
            Swal.fire('Erro', result.error, 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Erro ao excluir usuário.', 'error');
    }
}

async function acceptLgpd() {
    const checkbox = document.getElementById('acceptLgpdInput');
    if (!checkbox || !checkbox.checked) {
        Swal.fire('Atenção', 'Você precisa marcar a caixa de concordância.', 'warning');
        return;
    }
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/lgpd.php', { method: 'POST' });
        if (!response.ok) throw new Error('Falha ao registrar aceite.');

        const result = await response.json();
        if (result.success) {
            document.getElementById('lgpdModal').style.display = 'none';
            if (typeof currentUser !== 'undefined') currentUser.lgpdAccepted = true;
            Swal.fire('Obrigado', 'Termos aceitos.', 'success');
        } else {
            Swal.fire('Erro', result.message || 'Não foi possível salvar a aceitação.', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível registrar sua aceitação. Tente novamente.', 'error');
    }
}


function logout() {
    window.location.href = getProjectBaseUrl() + '/src/auth.php?logout=true';
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.main-content');
    if (sidebar) sidebar.classList.toggle('active');
    if (content) content.classList.toggle('active');
}
