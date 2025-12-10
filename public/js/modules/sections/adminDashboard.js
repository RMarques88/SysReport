import { getProjectBaseUrl } from '../../core/base.js';
import { TRANSLATE_STATUS } from '../../core/constants.js';
import { setAllUsers, setAllAdminReports, getState } from '../../core/state.js';
import { openShareModal } from './sharing.js';
import { openEditReportModal } from './reports.js';

export async function loadAdminDashboard() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Painel de Controle</h2>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" onclick="window.App.loadArchivedReportsView()"><i class="fas fa-archive"></i> Ver Arquivados</button>
                <button class="btn btn-primary" onclick="window.App.openAssignmentModal()"><i class="fas fa-plus-circle"></i> Nova Solicitação de Relatório</button>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 2rem;">
            <div class="card-body d-flex gap-2 align-center" style="flex-wrap: wrap;">
                <strong>Filtros:</strong>
                <input type="text" id="filterSearch" class="form-control" placeholder="Buscar por nome..." style="width: 200px;" onkeyup="window.App.renderAdminReportsTable()">
                <select id="filterStatus" class="form-control" style="width: 200px;" onchange="window.App.fetchAdminReports()">
                    <option value="">Todos os Status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="SUBMITTED">Enviado</option>
                    <option value="REJECTED">Rejeitado</option>
                </select>
                <select id="filterSector" class="form-control" style="width: 200px;" onchange="window.App.fetchAdminReports()">
                    <option value="">Todos os Setores</option>
                </select>
                <select id="filterUser" class="form-control" style="width: 200px;" onchange="window.App.fetchAdminReports()">
                    <option value="">Todos os Usuários</option>
                </select>
                <button class="btn btn-secondary" onclick="window.App.fetchAdminReports()"><i class="fas fa-sync"></i> Atualizar</button>
            </div>
        </div>

        <div id="adminReportsTable">Carregando...</div>
    `;

    await Promise.all([loadUsersForFilter(), loadSectorsForFilter()]);
    fetchAdminReports(false);
}

export async function loadArchivedReportsView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Relatórios Arquivados</h2>
            <button class="btn btn-secondary" onclick="window.App.loadAdminDashboard()"><i class="fas fa-arrow-left"></i> Voltar ao Painel</button>
        </div>
        
        <div class="card" style="margin-bottom: 2rem;">
            <div class="card-body d-flex gap-2 align-center" style="flex-wrap: wrap;">
                <strong>Filtros (Arquivados):</strong>
                <input type="text" id="filterSearch" class="form-control" placeholder="Buscar por nome..." style="width: 200px;" onkeyup="window.App.renderAdminReportsTable(null, true)">
                <select id="filterSector" class="form-control" style="width: 200px;" onchange="window.App.fetchArchivedReports()">
                    <option value="">Todos os Setores</option>
                </select>
                <select id="filterUser" class="form-control" style="width: 200px;" onchange="window.App.fetchArchivedReports()">
                    <option value="">Todos os Usuários</option>
                </select>
                <button class="btn btn-secondary" onclick="window.App.fetchArchivedReports()"><i class="fas fa-sync"></i> Atualizar</button>
            </div>
        </div>

        <div id="adminReportsTable">Carregando...</div>
    `;

    await Promise.all([loadUsersForFilter(), loadSectorsForFilter()]);
    fetchAdminReports(true);
}

export async function fetchArchivedReports() {
    fetchAdminReports(true);
}

async function loadSectorsForFilter() {
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/sectors.php');
        const sectors = await response.json();
        const select = document.getElementById('filterSector');
        if (select) {
            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }
            sectors.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadUsersForFilter() {
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php');
        const users = await response.json();
        setAllUsers(users);
        const select = document.getElementById('filterUser');
        if (select) {
            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }
            users.forEach(u => {
                // Filter out admins and superadmins
                if (u.role === 'admin' || u.role === 'superadmin') return;

                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.username;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

export async function fetchAdminReports(isArchived = false) {
    const container = document.getElementById('adminReportsTable');
    if (!container) return;

    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando relatórios...</div>';

    const search = document.getElementById('filterSearch') ? document.getElementById('filterSearch').value.toLowerCase() : '';
    const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
    const userFilter = document.getElementById('filterUser') ? document.getElementById('filterUser').value : '';
    const sectorFilter = document.getElementById('filterSector') ? document.getElementById('filterSector').value : '';

    try {
        let url = getProjectBaseUrl() + '/src/api/reports.php?admin=true';
        if (statusFilter && statusFilter !== 'Todos os Status') url += `&status=${statusFilter}`;
        if (userFilter) url += `&user_id=${userFilter}`;
        if (sectorFilter) url += `&sector_id=${sectorFilter}`;
        if (isArchived) url += `&archived=true`;

        const response = await fetch(url);
        const reports = await response.json();
        setAllAdminReports(reports);

        const filtered = filterAdminReports(reports, search);
        renderAdminReportsTable(filtered, isArchived);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger">Erro ao carregar relatórios.</p>';
    }
}

function filterAdminReports(reports, search) {
    const mapped = (reports || []).map(r => ({
        ...r,
        status: (r.status || 'PENDING').toUpperCase()
    })).filter(r => {
        if (search && !r.report_type.toLowerCase().includes(search) && !r.owner_name.toLowerCase().includes(search)) return false;
        return true;
    });

    // Smart Visibility Logic for Admin (Same as User)
    const groups = {};
    mapped.forEach(r => {
        const gid = r.group_id || r.id;
        if (!groups[gid]) groups[gid] = [];
        groups[gid].push(r);
    });

    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    let visibleReports = [];

    Object.values(groups).forEach(groupReports => {
        const hasSubmitted = groupReports.some(r => ['SUBMITTED'].includes(r.status));
        
        groupReports.forEach(r => {
            if (r.status === 'PENDING' && r.due_date) {
                const dueDate = new Date(r.due_date);
                if (hasSubmitted) {
                    if (!isNaN(dueDate) && dueDate > tenDaysFromNow) return;
                }
            }
            visibleReports.push(r);
        });
    });

    return visibleReports;
}

export function renderAdminReportsTable(reports = null, isArchived = false) {
    const container = document.getElementById('adminReportsTable');
    if (!container) return;

    const data = reports || getState().allAdminReports;

    if (!data || data.length === 0) {
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
                        <th>Setor</th>
                        <th>Versão</th>
                        <th>Data Atribuição/Envio</th>
                        <th>Prazo</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(r => {
        let badgeClass = 'badge-pending';
        if (r.status === 'SUBMITTED') badgeClass = 'badge-submitted';
        if (r.status === 'REJECTED') badgeClass = 'badge-rejected';

        html += `
            <tr>
                <td><span class="badge ${badgeClass}">${TRANSLATE_STATUS[r.status] || r.status}</span></td>
                <td>
                    <strong>${r.report_type}</strong><br>
                    ${r.original_filename ? `<small class="text-muted"><i class="fas fa-paperclip"></i> ${r.original_filename}</small>` : '<small class="text-muted">Aguardando envio</small>'}
                </td>
                <td>${r.owner_name}</td>
                <td>${r.sector_name || '-'}</td>
                <td>${r.version > 0 ? 'v' + r.version : '-'}</td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td>${r.due_date ? new Date(r.due_date).toLocaleDateString() : '-'}</td>
                <td>
                        ${!isArchived ? `
                        <button class="btn btn-sm btn-primary" onclick="window.App.openEditReportModal('${r.id}', '${r.due_date}', '${r.recurrence_days || ''}', '${r.description || ''}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-secondary" onclick="window.App.openHistoryModal('${r.group_id}', '${r.report_type}')" title="Histórico de Versões"><i class="fas fa-history"></i></button> 
                        <button class="btn btn-sm btn-warning" onclick="window.App.openShareModal('${r.id}', '${r.original_filename || r.report_type}')" title="Permissões de Acesso"><i class="fas fa-share-alt"></i></button>
                        ${r.status !== 'PENDING' ? `
                        <button class="btn btn-sm btn-info" onclick="window.App.previewReport('${r.file_path}', '${r.original_filename}')" title="Visualizar"><i class="fas fa-eye"></i></button>
                        <a href="${getProjectBaseUrl()}/uploads/${r.file_path}" class="btn btn-sm btn-success" download="${r.original_filename}" title="Baixar"><i class="fas fa-download"></i></a>
                        ${r.status === 'SUBMITTED' ? `
                            <button class="btn btn-sm btn-danger" style="background:#ef4444; border:none;" onclick="window.App.rejectReport('${r.id}')" title="Rejeitar"><i class="fas fa-ban"></i></button>
                            <button class="btn btn-sm btn-primary" style="background:#3b82f6; border:none;" onclick="window.App.replaceFile('${r.id}')" title="Substituir Arquivo"><i class="fas fa-cloud-upload-alt"></i></button>
                        ` : ''}
                        ` : ''}
                        <button class="btn btn-sm btn-warning" style="background:#f59e0b; border:none;" onclick="window.App.archiveReport('${r.id}')" title="Arquivar"><i class="fas fa-archive"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="window.App.deleteReport('${r.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                        ` : `
                        <button class="btn btn-sm btn-info" onclick="window.App.previewReport('${r.file_path}', '${r.original_filename}')" title="Visualizar"><i class="fas fa-eye"></i></button>
                        <a href="${getProjectBaseUrl()}/uploads/${r.file_path}" class="btn btn-sm btn-success" download="${r.original_filename}" title="Baixar"><i class="fas fa-download"></i></a>
                        <button class="btn btn-sm btn-success" onclick="window.App.unarchiveReport('${r.id}')" title="Desarquivar"><i class="fas fa-box-open"></i> Desarquivar</button>
                        <button class="btn btn-sm btn-danger" onclick="window.App.deleteReport('${r.id}')" title="Excluir Permanentemente"><i class="fas fa-trash"></i></button>
                        `}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

export async function replaceFile(id) {
    const { value: file } = await Swal.fire({
        title: 'Substituir Arquivo',
        text: 'Selecione o novo arquivo para substituir o atual (XLS, XLSX, DOC, DOCX)',
        input: 'file',
        inputAttributes: {
            'accept': '.xls,.xlsx,.doc,.docx',
            'aria-label': 'Upload your file'
        },
        showCancelButton: true,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Cancelar'
    });

    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('report_id', id);

        try {
            Swal.fire({ title: 'Enviando...', didOpen: () => Swal.showLoading() });
            
            const response = await fetch(getProjectBaseUrl() + '/src/api/upload.php', {
                method: 'POST',
                body: formData
            });
            const res = await response.json();
            
            if (res.success) {
                fetchAdminReports();
                Swal.fire('Sucesso', 'Arquivo substituído com sucesso!', 'success');
            } else {
                Swal.fire('Erro', res.message || 'Erro ao enviar arquivo.', 'error');
            }
        } catch (e) {
            Swal.fire('Erro', 'Erro na requisição.', 'error');
        }
    }
}

export async function rejectReport(id) {
    const { value: reason } = await Swal.fire({
        title: 'Rejeitar Relatório',
        text: 'Informe o motivo da rejeição (opcional):',
        input: 'textarea',
        inputAttributes: {
            style: 'font-size: 0.9rem; min-height: 150px;'
        },
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Rejeitar',
        cancelButtonText: 'Cancelar'
    });

    if (reason === undefined) return;

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

export async function openHistoryModal(groupId, reportName) {
    if (!document.getElementById('historyModal')) {
        const modalHtml = `
        <div id="historyModal" class="modal">
            <div class="modal-content" style="max-width:800px;">
                <div class="modal-header">
                    <h2>Histórico: ${reportName}</h2>
                    <span class="close" onclick="document.getElementById('historyModal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body" id="historyContent">
                    Carregando...
                </div>
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

        if (!history || history.length === 0) {
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
            let badgeClass = 'badge-pending';
            if (h.status === 'SUBMITTED') badgeClass = 'badge-submitted';
            if (h.status === 'APPROVED') badgeClass = 'badge-submitted';
            if (h.status === 'REJECTED') badgeClass = 'badge-rejected';

            html += `
            <tr>
                <td>v${h.version}</td>
                <td>${new Date(h.created_at).toLocaleString()}</td>
                <td><span class="badge ${badgeClass}">${TRANSLATE_STATUS[h.status] || h.status}</span></td>
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
