import { getProjectBaseUrl } from '../../core/base.js';
import { fetchAdminReports } from './adminDashboard.js';

export function openEditReportModal(id, dueDate, recurrence, desc) {
    if (!document.getElementById('editReportModal')) {
        const modalHtml = `
        <div id="editReportModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Editar Relatório</h2>
                    <span class="close" onclick="document.getElementById('editReportModal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <form onsubmit="window.App.handleEditReport(event)">
                        <input type="hidden" id="editReportId" name="id">
                        <div class="form-group">
                            <label>Prazo</label>
                            <input type="date" id="editReportDue" name="due_date" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Recorrência (Dias)</label>
                            <input type="number" id="editReportRecur" name="recurrence_days" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Instruções</label>
                            <textarea id="editReportDesc" name="description" class="form-control"></textarea>
                        </div>
                        <div class="d-flex justify-end gap-2 mt-4">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('editReportModal').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('editReportId').value = id;
    document.getElementById('editReportDue').value = dueDate && dueDate !== 'null' ? dueDate.split(' ')[0] : '';
    document.getElementById('editReportRecur').value = recurrence && recurrence !== 'null' ? recurrence : '';
    document.getElementById('editReportDesc').value = desc && desc !== 'null' ? desc : '';
    document.getElementById('editReportModal').style.display = 'block';
}

export async function handleEditReport(e) {
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

export async function deleteReport(id) {
    const result = await Swal.fire({
        title: 'Excluir Permanentemente?',
        html: 'Esta ação apagará <b>todos os registros</b> e <b>arquivos anexados</b> do servidor.<br>Esta ação é irreversível.<br><br>Considere <b>Arquivar</b> se quiser apenas ocultar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir tudo!',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php?id=' + id, { method: 'DELETE' });
        const res = await response.json();
        if (res.success) {
            fetchAdminReports();
            Swal.fire('Deletado!', 'O relatório e arquivos foram excluídos.', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro ao excluir', 'error'); }
}

export async function archiveReport(id) {
    const result = await Swal.fire({
        title: 'Arquivar Relatório?',
        text: 'O relatório será ocultado das buscas e o usuário não receberá mais notificações.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, arquivar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, action: 'archive' })
        });
        const res = await response.json();
        if (res.success) {
            fetchAdminReports();
            Swal.fire('Arquivado!', 'O relatório foi arquivado.', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro ao arquivar', 'error'); }
}

export async function unarchiveReport(id) {
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/reports.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, action: 'unarchive' })
        });
        const res = await response.json();
        if (res.success) {
            // Refresh current view (likely archived view)
            if (window.App.fetchArchivedReports) window.App.fetchArchivedReports();
            else fetchAdminReports();
            
            Swal.fire('Desarquivado!', 'O relatório está ativo novamente.', 'success');
        } else {
            Swal.fire('Erro', res.message, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Erro ao desarquivar', 'error'); }
}
