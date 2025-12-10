import { getProjectBaseUrl } from '../../core/base.js';

export async function loadUsersView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando usuários...</div>';

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php');
        const users = await response.json();

        let html = `
            <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
                <h2>Gerenciar Usuários</h2>
                <button class="btn btn-success" onclick="window.App.openUserModal()"><i class="fas fa-plus"></i> Novo Usuário</button>
            </div>
            
            <div class="card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Setor</th>
                            <th>Função</th>
                            <th>Criado em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>`;

        if (!users || users.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted">Nenhum usuário encontrado.</td></tr>';
        } else {
            users.forEach(u => {
                const currentUserRole = window.currentUser ? window.currentUser.role : 'user';
                const currentUserId = window.currentUser ? window.currentUser.id : -1;
                
                let canEdit = true;
                let canDelete = u.id != currentUserId;

                if (currentUserRole === 'admin' && u.role === 'superadmin') {
                    canEdit = false;
                    canDelete = false;
                }
                // Superadmin can edit everyone except maybe other superadmins? 
                // For now, let's allow superadmin to edit admin.


                let roleBadge = 'badge-submitted';
                let roleLabel = 'Usuário';
                if (u.role === 'admin') { roleBadge = 'badge-approved'; roleLabel = 'Administrador'; }
                if (u.role === 'superadmin') { roleBadge = 'badge-warning'; roleLabel = 'Super Admin'; }

                html += `
                    <tr>
                        <td>
                            <div class="d-flex align-center gap-2">
                                <div style="width:32px; height:32px; background: #e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; color: var(--text-muted);">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <strong>${u.username}</strong><br>
                                    <small class="text-muted">${u.email || ''}</small>
                                </div>
                            </div>
                        </td>
                        <td>${u.sector_name || '-'}</td>
                        <td>
                            <span class="badge ${roleBadge}">${roleLabel}</span>
                        </td>
                        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                            ${canEdit ? 
                                `<button class="btn btn-sm btn-primary" onclick="window.App.openUserModal(${u.id}, '${u.username}', '${u.email || ''}', '${u.role}', '${u.sector_id || ''}')" title="Editar"><i class="fas fa-edit"></i></button>` : 
                                `<button class="btn btn-sm btn-secondary" disabled title="Sem permissão"><i class="fas fa-lock"></i></button>`
                            }
                            ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="window.App.deleteUser(${u.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                        </td>
                    </tr>`;
            });
        }

        html += '</tbody></table></div>';
        mainContent.innerHTML = html;

        await ensureUserModal();

    } catch (error) {
        console.error(error);
        mainContent.innerHTML = '<p class="text-danger">Erro ao carregar usuários.</p>';
    }
}

async function ensureUserModal() {
    // Always fetch sectors to ensure dropdown is up to date
    let sectorOptions = '<option value="">Sem Setor</option>';
    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/sectors.php');
        const sectors = await res.json();
        sectors.forEach(s => {
            sectorOptions += `<option value="${s.id}">${s.name}</option>`;
        });
    } catch(e) { console.error(e); }

    const existingModal = document.getElementById('userModal');
    if (existingModal) {
        const select = document.getElementById('sector_id');
        if (select) select.innerHTML = sectorOptions;
        return;
    }

    const currentUserRole = window.currentUser ? window.currentUser.role : 'user';
    let roleOptions = `
        <option value="user">Usuário Comum</option>
        <option value="admin">Administrador</option>
    `;
    if (currentUserRole === 'superadmin') {
        roleOptions += `<option value="superadmin">Super Admin</option>`;
    }

    const modalHtml = `
        <div id="userModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="userModalTitle">Novo Usuário</h2>
                    <button class="close" onclick="document.getElementById('userModal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
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
                            <label>Setor</label>
                            <select class="form-control" id="sector_id" name="sector_id">
                                ${sectorOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Senha <small class="text-muted">(Deixe em branco p/ manter atual)</small></label>
                            <input type="password" class="form-control" id="password" name="password">
                        </div>
                        <div class="form-group">
                            <label>Função</label>
                            <select class="form-control" id="role" name="role">
                                ${roleOptions}
                            </select>
                        </div>
                        <div class="text-right mt-4">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('userModal').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-success">Salvar Usuário</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('userForm').addEventListener('submit', handleSaveUser);
}

export function openUserModal(id = '', username = '', email = '', role = 'user', sector_id = '') {
    document.getElementById('userId').value = id;
    document.getElementById('username').value = username;
    document.getElementById('email').value = email;
    document.getElementById('password').value = '';
    document.getElementById('role').value = role;
    document.getElementById('sector_id').value = sector_id;
    document.getElementById('userModalTitle').textContent = id ? 'Editar Usuário' : 'Novo Usuário';
    document.getElementById('userModal').style.display = 'block';
}

async function handleSaveUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const method = data.id ? 'PUT' : 'POST';
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success || result.id) {
            document.getElementById('userModal').style.display = 'none';
            loadUsersView();
            Swal.fire('Sucesso', 'Usuário salvo com sucesso!', 'success');
        } else {
            Swal.fire('Erro', (result.error || 'Erro desconhecido'), 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Erro de conexão.', 'error');
    }
}

export async function deleteUser(id) {
    const result = await Swal.fire({
        title: 'Excluir Usuário?',
        text: 'Tem certeza que deseja excluir este usuário?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/users.php?id=' + id, { method: 'DELETE' });
        const res = await response.json();

        if (res.success) {
            loadUsersView();
            Swal.fire('Deletado', 'Usuário excluído.', 'success');
        } else {
            Swal.fire('Erro', res.error, 'error');
        }
    } catch (err) {
        Swal.fire('Erro', 'Erro ao excluir usuário.', 'error');
    }
}
