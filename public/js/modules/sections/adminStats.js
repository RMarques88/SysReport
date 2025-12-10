import { getProjectBaseUrl } from '../../core/base.js';

export async function loadAdminStatsView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Destroy existing charts if they exist (using Chart.js registry)
    const existingSector = Chart.getChart("sectorChart");
    if (existingSector) existingSector.destroy();

    const existingType = Chart.getChart("typeChart");
    if (existingType) existingType.destroy();

    mainContent.innerHTML = `
        <h2>Estatísticas e Relatórios de Desempenho</h2>
        
        <div class="row mt-4" style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 400px;">
                <div class="card-header">Relatórios por Setor</div>
                <div class="card-body">
                    <canvas id="sectorChart"></canvas>
                </div>
            </div>
            <div class="card" style="flex: 1; min-width: 400px;">
                <div class="card-header">Relatórios por Tipo</div>
                <div class="card-body">
                    <canvas id="typeChart"></canvas>
                </div>
            </div>
        </div>

        <div class="row mt-4" style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
                <div class="card-header">Top 5 Usuários (Mais Relatórios Atribuídos)</div>
                <div class="card-body" id="topAssignedTable">Carregando...</div>
            </div>
            <div class="card" style="flex: 1; min-width: 300px;">
                <div class="card-header">Top 5 Usuários (Mais Pontuais)</div>
                <div class="card-body" id="topOntimeTable">Carregando...</div>
            </div>
            <div class="card" style="flex: 1; min-width: 300px;">
                <div class="card-header">Top 5 Usuários (Mais Atrasos)</div>
                <div class="card-body" id="topLateTable">Carregando...</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/admin_stats.php');
        const data = await response.json();

        if (data.error) {
            mainContent.innerHTML += `<p class="text-danger">${data.error}</p>`;
            return;
        }

        renderCharts(data);
        renderTables(data);

    } catch (e) {
        console.error(e);
        mainContent.innerHTML = '<p class="text-danger">Erro ao carregar estatísticas.</p>';
    }
}

function renderCharts(data) {
    // Sector Chart
    const ctxSector = document.getElementById('sectorChart');
    if (ctxSector) {
        const existing = Chart.getChart(ctxSector);
        if (existing) existing.destroy();
        
        new Chart(ctxSector.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.by_sector.map(i => i.name || 'Sem Setor'),
                datasets: [{
                    label: 'Relatórios',
                    data: data.by_sector.map(i => i.count),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    // Type Chart
    const ctxType = document.getElementById('typeChart');
    if (ctxType) {
        const existing = Chart.getChart(ctxType);
        if (existing) existing.destroy();

        new Chart(ctxType.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.by_type.map(i => i.name),
                datasets: [{
                    label: 'Relatórios',
                    data: data.by_type.map(i => i.count),
                    backgroundColor: '#10b981'
                }]
            },
            options: { responsive: true, indexAxis: 'y' }
        });
    }
}

function renderTables(data) {
    const createTable = (items, badgeColor) => {
        if (!items || items.length === 0) return '<p class="text-muted">Sem dados.</p>';
        let html = '<table class="table table-sm"><thead><tr><th>Usuário</th><th>Qtd</th></tr></thead><tbody>';
        items.forEach(i => {
            html += `<tr><td>${i.username}</td><td><span class="badge" style="background:${badgeColor}; color:white;">${i.count}</span></td></tr>`;
        });
        html += '</tbody></table>';
        return html;
    };

    document.getElementById('topAssignedTable').innerHTML = createTable(data.top_assigned, '#64748b');
    document.getElementById('topOntimeTable').innerHTML = createTable(data.top_ontime, '#10b981');
    document.getElementById('topLateTable').innerHTML = createTable(data.top_late, '#ef4444');
}
