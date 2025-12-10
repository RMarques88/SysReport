import { getProjectBaseUrl } from '../../core/base.js';

let diskChartInstance = null;
let reportsChartInstance = null;

export async function loadSuperAdminDashboard() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Destroy existing charts if they exist to prevent canvas reuse error
    if (diskChartInstance) {
        diskChartInstance.destroy();
        diskChartInstance = null;
    }
    if (reportsChartInstance) {
        reportsChartInstance.destroy();
        reportsChartInstance = null;
    }

    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Painel de Infraestrutura (Super Admin)</h2>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" onclick="window.App.openSettingsModal()"><i class="fas fa-cog"></i> SMTP</button>
                <button class="btn btn-secondary" onclick="window.App.downloadDbBackup()"><i class="fas fa-database"></i> Backup DB</button>
                <button class="btn btn-secondary" onclick="window.App.downloadFullBackup()"><i class="fas fa-file-archive"></i> Backup Completo</button>
            </div>
        </div>

        <div id="serverStats" class="dashboard-grid mt-4">
            <div class="card"><div class="card-body text-center"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>
        </div>
        <div class="row mt-4" style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
                <div class="card-header">Armazenamento do Servidor</div>
                <div class="card-body">
                    <canvas id="diskChart"></canvas>
                </div>
            </div>
            <div class="card" style="flex: 1; min-width: 300px;">
                <div class="card-header">Status dos Relatórios</div>
                <div class="card-body">
                    <canvas id="reportsChart"></canvas>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/server_stats.php');
        const stats = await response.json();

        if (stats.error) {
            mainContent.innerHTML += `<p class="text-danger">${stats.error}</p>`;
            return;
        }

        renderStatsCards(stats);
        renderCharts(stats);

    } catch (e) {
        console.error(e);
        mainContent.innerHTML = '<p class="text-danger">Erro ao carregar estatísticas.</p>';
    }
}

function renderStatsCards(stats) {
    const container = document.getElementById('serverStats');
    
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    container.innerHTML = `
        <div class="card">
            <div class="card-body text-center">
                <h3 class="text-primary">${stats.cpu}%</h3>
                <p class="text-muted">Uso de CPU (Estimado)</p>
            </div>
        </div>
        <div class="card">
            <div class="card-body text-center">
                <h3 class="text-info">${formatBytes(stats.disk.uploads_size)}</h3>
                <p class="text-muted">Tamanho da Pasta Uploads</p>
            </div>
        </div>
        <div class="card">
            <div class="card-body text-center">
                <h3 class="text-success">${stats.reports.total}</h3>
                <p class="text-muted">Total de Relatórios Gerados</p>
            </div>
        </div>
        <div class="card">
            <div class="card-body text-center">
                <h3 class="text-warning">${stats.reports.pending}</h3>
                <p class="text-muted">Relatórios Pendentes</p>
            </div>
        </div>
    `;
}

function renderCharts(stats) {
    // Disk Chart
    const diskCanvas = document.getElementById('diskChart');
    if (diskCanvas) {
        const existingChart = Chart.getChart(diskCanvas);
        if (existingChart) existingChart.destroy();
        
        const ctxDisk = diskCanvas.getContext('2d');
        diskChartInstance = new Chart(ctxDisk, {
            type: 'doughnut',
            data: {
                labels: ['Livre', 'Usado (Outros)', 'Usado (Uploads)'],
                datasets: [{
                    data: [
                        stats.disk.free, 
                        stats.disk.used - stats.disk.uploads_size, 
                        stats.disk.uploads_size
                    ],
                    backgroundColor: ['#10b981', '#64748b', '#3b82f6']
                }]
            },
            options: { responsive: true }
        });
    }

    // Reports Chart
    const reportsCanvas = document.getElementById('reportsChart');
    if (reportsCanvas) {
        const existingChart = Chart.getChart(reportsCanvas);
        if (existingChart) existingChart.destroy();

        const ctxRep = reportsCanvas.getContext('2d');
        reportsChartInstance = new Chart(ctxRep, {
            type: 'pie',
            data: {
                labels: ['Enviados', 'Pendentes', 'Rejeitados', 'Arquivados'],
                datasets: [{
                    data: [
                        stats.reports.sent,
                        stats.reports.pending,
                        stats.reports.rejected,
                        stats.reports.archived
                    ],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#64748b']
                }]
            },
            options: { responsive: true }
        });
    }
}

export async function openSettingsModal() {
    if (!document.getElementById('settingsModal')) {
        const modalHtml = `
        <div id="settingsModal" class="modal">
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2>Configurações do Sistema</h2>
                    <span class="close" onclick="document.getElementById('settingsModal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body" id="settingsContent">
                    Carregando...
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('settingsModal').style.display = 'block';
    const container = document.getElementById('settingsContent');
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(getProjectBaseUrl() + '/src/api/settings.php');
        const settings = await res.json();

        let html = `
        <form onsubmit="event.preventDefault(); window.App.saveSettings(this);">
            <h3>Configurações de SMTP (E-mail)</h3>
            <div class="form-group">
                <label>Host SMTP</label>
                <input type="text" name="smtp_host" class="form-control" value="${settings.smtp_host || ''}" placeholder="smtp.example.com">
            </div>
            <div class="form-group">
                <label>Porta SMTP</label>
                <input type="number" name="smtp_port" class="form-control" value="${settings.smtp_port || '587'}">
            </div>
            <div class="form-group">
                <label>Usuário SMTP</label>
                <input type="text" name="smtp_user" class="form-control" value="${settings.smtp_user || ''}">
            </div>
            <div class="form-group">
                <label>Senha SMTP</label>
                <input type="password" name="smtp_pass" class="form-control" value="${settings.smtp_pass || ''}" placeholder="********">
                <small class="text-muted">Deixe em branco para manter a senha atual.</small>
            </div>
            <div class="form-group">
                <label>Segurança</label>
                <select name="smtp_secure" class="form-control">
                    <option value="tls" ${settings.smtp_secure === 'tls' ? 'selected' : ''}>TLS</option>
                    <option value="ssl" ${settings.smtp_secure === 'ssl' ? 'selected' : ''}>SSL</option>
                    <option value="" ${!settings.smtp_secure ? 'selected' : ''}>Nenhuma</option>
                </select>
            </div>
            <div class="form-group">
                <label>E-mail de Envio (From)</label>
                <input type="email" name="smtp_from_email" class="form-control" value="${settings.smtp_from_email || ''}">
            </div>
            <div class="form-group">
                <label>Nome de Envio (From Name)</label>
                <input type="text" name="smtp_from_name" class="form-control" value="${settings.smtp_from_name || ''}">
            </div>
            <div class="d-flex justify-end gap-2 mt-2">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('settingsModal').style.display='none'">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Configurações</button>
            </div>
        </form>
        `;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = '<p class="text-danger">Erro ao carregar configurações.</p>';
    }
}

export async function saveSettings(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await response.json();
        
        if (res.success) {
            Swal.fire('Sucesso', 'Configurações salvas com sucesso!', 'success');
            document.getElementById('settingsModal').style.display = 'none';
        } else {
            Swal.fire('Erro', res.error || 'Erro ao salvar.', 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Erro na requisição.', 'error');
    }
}

export function downloadDbBackup() {
    window.location.href = getProjectBaseUrl() + '/src/api/backup.php?action=db_dump';
}

export function downloadFullBackup() {
    window.location.href = getProjectBaseUrl() + '/src/api/backup.php?action=full_backup';
}
