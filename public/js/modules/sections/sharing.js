import { getProjectBaseUrl } from '../../core/base.js';
import { getState, setAllUsers } from '../../core/state.js';

let shareSelectedUsers = [];

export async function openShareModal(reportId, reportName) {
    shareSelectedUsers = [];
    const existing = document.getElementById('shareModalAdmin');
    if (existing) existing.remove();

    if (!getState().allUsers || getState().allUsers.length === 0) {
        try {
            const res = await fetch(getProjectBaseUrl() + '/src/api/users.php');
            const users = await res.json();
            setAllUsers(users);
        } catch (e) { console.error('Error loading users for share', e); }
    }

    const modalHtml = `
        <div id="shareModalAdmin" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Permissões de Acesso</h2>
                    <span class="close" onclick="document.getElementById('shareModalAdmin').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <p class="text-muted" style="margin-bottom: 1.5rem;">Gerencie quem pode visualizar: <strong>${reportName}</strong></p>
                    
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
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('shareModalAdmin').style.display = 'block';

    document.getElementById('shareUserInput').addEventListener('keyup', handleShareUserSearch);
    await loadExistingShares(reportId);
}

async function loadExistingShares(reportId) {
    const list = document.getElementById('sharedUsersListAdmin');
    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/shares.php?report_id=' + reportId);
        const users = await res.json();
        list.innerHTML = '';
        if (!users || users.length === 0) {
            list.innerHTML = '<li style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Nenhum usuário tem acesso extra a este arquivo.</li>';
            return;
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
                <button type="button" class="btn btn-sm btn-danger" onclick="window.App.removeShare('${reportId}', '${u.id}')" title="Remover Acesso"><i class="fas fa-trash"></i></button>
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

    const matches = (getState().allUsers || []).filter(u =>
        u.username.toLowerCase().includes(term) &&
        !shareSelectedUsers.find(s => s.id == u.id)
    );

    if (matches.length > 0) {
        suggestionsBox.style.display = 'block';
        matches.forEach(u => {
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
        await fetch(getProjectBaseUrl() + '/src/api/shares.php', {
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

export async function removeShare(reportId, userId) {
    const result = await Swal.fire({
        title: 'Remover acesso?',
        text: 'O usuário perderá a visualização deste arquivo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, remover',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        await fetch(getProjectBaseUrl() + `/src/api/shares.php?report_id=${reportId}&user_id=${userId}`, { method: 'DELETE' });
        await loadExistingShares(reportId);
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
