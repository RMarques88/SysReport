import { getProjectBaseUrl } from '../../core/base.js';
import { loadUserDashboard } from './userDashboard.js';

export async function openUploadModal(reportId, reportName, status = 'PENDING') {
    if (status === 'SUBMITTED') {
        const result = await Swal.fire({
            title: 'Atenção',
            text: 'Já existe um arquivo enviado. Deseja enviar uma nova versão e substituir o anterior?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, substituir',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
    }

    const existing = document.getElementById('uploadModal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="uploadModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Enviar Relatório</h2>
                    <button class="close" onclick="document.getElementById('uploadModal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="uploadReportName" class="text-muted"></p>
                    <form id="uploadForm">
                        <input type="hidden" name="report_id" id="uploadReportId">
                        <div class="form-group">
                            <label>Selecione o arquivo (XLS, XLSX, DOC, DOCX)</label>
                            <input type="file" class="form-control" name="file" accept=".xls,.xlsx,.doc,.docx" required>
                        </div>
                        <div class="text-right mt-4">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('uploadModal').style.display='none'">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Enviar Arquivo</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('uploadForm').addEventListener('submit', handleUploadById);

    document.getElementById('uploadReportId').value = reportId;
    document.getElementById('uploadReportName').textContent = 'Para: ' + reportName;
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
            loadUserDashboard();
            Swal.fire('Sucesso', 'Arquivo enviado com sucesso!', 'success');
        } else {
            Swal.fire('Erro', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Erro', 'Erro ao enviar', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Arquivo';
    }
}
