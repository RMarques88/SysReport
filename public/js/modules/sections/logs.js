import { getProjectBaseUrl } from '../../core/base.js';

export async function loadLogsView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.innerHTML = `
        <div class="d-flex justify-between align-center" style="margin-bottom: 2rem;">
            <h2>Logs do Sistema</h2>
            <button class="btn btn-secondary" onclick="window.App.loadLogsView()"><i class="fas fa-sync"></i> Atualizar</button>
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
                    <tbody>`;

        if (!logs || logs.length === 0) {
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
                    </tr>`;
            });
        }

        html += '</tbody></table></div>';
        document.getElementById('logsTableContainer').innerHTML = html;

    } catch (e) {
        console.error(e);
        document.getElementById('logsTableContainer').innerHTML = '<p class="text-danger">Erro ao carregar logs.</p>';
    }
}
