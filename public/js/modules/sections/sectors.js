import { getProjectBaseUrl } from '../../core/base.js';

export async function loadSectorsView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Gerenciar Setores</h2>
            <button class="btn btn-primary" onclick="window.App.openSectorModal()"><i class="fas fa-plus-circle"></i> Novo Setor</button>
        </div>
        
        <div class="card">
            <div class="card-body">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="sectorsTableBody">
                        <tr><td colspan="3" class="text-center">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    fetchSectors();
}

export async function fetchSectors() {
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/sectors.php');
        const sectors = await response.json();
        renderSectorsTable(sectors);
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Erro ao carregar setores', 'error');
    }
}

function renderSectorsTable(sectors) {
    const tbody = document.getElementById('sectorsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (sectors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum setor cadastrado.</td></tr>';
        return;
    }

    sectors.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.name}</td>
            <td>${s.description || '-'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="window.App.openSectorModal('${s.id}', '${s.name}', '${s.description || ''}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="window.App.deleteSector('${s.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

export function openSectorModal(id = '', name = '', description = '') {
    const isEdit = !!id;
    const title = isEdit ? 'Editar Setor' : 'Novo Setor';

    Swal.fire({
        title: title,
        html: `
            <input type="hidden" id="sectorId" value="${id}">
            <div class="form-group text-left">
                <label>Nome do Setor</label>
                <input type="text" id="sectorName" class="form-control" value="${name}">
            </div>
            <div class="form-group text-left">
                <label>Descrição</label>
                <textarea id="sectorDesc" class="form-control">${description}</textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        preConfirm: async () => {
            const newName = document.getElementById('sectorName').value;
            const newDesc = document.getElementById('sectorDesc').value;
            const newId = document.getElementById('sectorId').value;

            if (!newName) {
                Swal.showValidationMessage('Nome é obrigatório');
                return false;
            }

            try {
                const res = await fetch(getProjectBaseUrl() + '/src/api/sectors.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: newId, name: newName, description: newDesc })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Erro ao salvar');
                return true;
            } catch (e) {
                Swal.showValidationMessage(e.message);
                return false;
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Sucesso', 'Setor salvo com sucesso!', 'success');
            fetchSectors();
        }
    });
}

export async function deleteSector(id) {
    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: "Isso não pode ser desfeito!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir!'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(getProjectBaseUrl() + '/src/api/sectors.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: id })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('Excluído!', 'Setor excluído.', 'success');
                fetchSectors();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            Swal.fire('Erro', 'Erro ao excluir setor.', 'error');
        }
    }
}
