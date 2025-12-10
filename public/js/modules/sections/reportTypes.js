import { getProjectBaseUrl } from '../../core/base.js';

export async function loadAdminTypesView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Tipos de Relatório</h2>
            <button class="btn btn-success" onclick="window.App.openTypeModal()"><i class="fas fa-plus"></i> Novo Tipo</button>
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
                <tbody>`;

        if (!types || types.length === 0) html += '<tr><td colspan="3" class="text-center">Nenhum tipo cadastrado.</td></tr>';
        else {
            types.forEach(t => {
                html += `
                    <tr>
                        <td>${t.name}</td>
                        <td>${t.description}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="window.App.openTypeModal('${t.id}', '${t.name}', '${t.description}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="window.App.deleteType('${t.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            });
        }

        html += '</tbody></table></div>';
        document.getElementById('typesTableContainer').innerHTML = html;

        ensureTypeModal();

    } catch (e) {
        console.error(e);
        document.getElementById('typesTableContainer').innerHTML = '<p class="text-danger">Erro ao carregar.</p>';
    }
}

function ensureTypeModal() {
    if (document.getElementById('typeModal')) return;
    const modalHtml = `
        <div id="typeModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="typeModalTitle">Novo Tipo</h2>
                    <button class="close" onclick="document.getElementById('typeModal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
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
                        <div class="text-right mt-4">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('typeModal').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-success">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('typeForm').addEventListener('submit', handleSaveType);
}

export function openTypeModal(id = '', name = '', desc = '') {
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

export async function deleteType(id) {
    const result = await Swal.fire({
        title: 'Excluir Tipo?',
        text: 'Esta ação não pode ser desfeita.',
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
