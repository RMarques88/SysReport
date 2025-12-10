import { getProjectBaseUrl } from '../../core/base.js';
import { getState, setAllUsers } from '../../core/state.js';
import { fetchAdminReports } from './adminDashboard.js';

let assignmentSelectedUsers = [];

export async function openAssignmentModal() {
    assignmentSelectedUsers = [];
    const existing = document.getElementById('assignmentModal');
    if (existing) existing.remove();

    if (!getState().allUsers || getState().allUsers.length === 0) {
        try {
            const res = await fetch(getProjectBaseUrl() + '/src/api/users.php');
            const users = await res.json();
            setAllUsers(users);
        } catch (e) { console.error('Error loading users for assignment', e); }
    }

    const modalHtml = `
        <div id="assignmentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Nova Solicitação</h2>
                    <button class="close" onclick="document.getElementById('assignmentModal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
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
                        <div class="text-right mt-4">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('assignmentModal').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Criar Solicitação</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('assignmentModal').style.display = 'block';

    const typeSelect = document.getElementById('assignTypeSelect');
    try {
        const types = await (await fetch(getProjectBaseUrl() + '/src/api/admin_report_types.php')).json();
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            typeSelect.appendChild(opt);
        });
    } catch (e) { console.error('Error loading types', e); }

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

    const matches = (getState().allUsers || []).filter(u =>
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
            div.innerHTML = `<strong>${u.username}</strong> <small class="text-muted">(${u.sector_name || 'Sem Setor'})</small>`;
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
            <i class="fas fa-trash" style="cursor: pointer; color: #ef4444;" onclick="window.App.removeUserFromAssignment('${u.id}')"></i>
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

    const userIds = assignmentSelectedUsers.map(u => u.id);
    formData.append('user_ids', JSON.stringify(userIds));

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('assignmentModal').style.display = 'none';
            fetchAdminReports();
            Swal.fire('Sucesso', result.message, 'success');
        } else {
            Swal.fire('Erro', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Erro', 'Erro ao criar solicitação.', 'error');
        console.error(err);
    }
}

export const assignmentActions = {
    handleUserSearch,
    selectUserForAssignment,
    removeUserFromAssignment,
    renderSelectedUsers
};
