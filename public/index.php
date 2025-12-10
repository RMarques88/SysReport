<?php
require_once __DIR__ . '/../src/auth.php';
requireLogin();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - SysReport</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/@sweetalert2/theme-bootstrap-4/bootstrap-4.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <!-- SheetJS for XLS Preview -->
    <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
    <!-- JSZip (Required for docx-preview) -->
    <script src="https://unpkg.com/jszip/dist/jszip.min.js"></script>
    <!-- Docx Preview -->
    <script src="https://unpkg.com/docx-preview/dist/docx-preview.min.js"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="wrapper">
        <!-- Sidebar -->
        <nav class="sidebar">
            <div class="sidebar-brand">
                <i class="fas fa-file-alt"></i> &nbsp; SysReport
            </div>
            <ul class="nav-item">
                <?php if ($_SESSION['role'] === 'superadmin'): ?>
                    <li><a href="#" class="nav-link" onclick="loadView('superadmin_dashboard')"><i class="fas fa-server"></i> Infraestrutura</a></li>
                    <li><a href="#" class="nav-link" onclick="loadView('users')"><i class="fas fa-users"></i> Usuários</a></li>
                    <li><a href="#" class="nav-link" onclick="loadView('logs')"><i class="fas fa-list"></i> Logs</a></li>
                <?php else: ?>
                    <li><a href="#" class="nav-link" onclick="loadView('dashboard')"><i class="fas fa-tachometer-alt"></i> Início</a></li>
                    <?php if ($_SESSION['role'] !== 'superadmin'): ?>
                        <li><a href="#" class="nav-link" onclick="loadView('reports')"><i class="fas fa-folder"></i> Relatórios</a></li>
                    <?php endif; ?>
                    
                    <?php if ($_SESSION['role'] === 'admin'): ?>
                        <li><a href="#" class="nav-link" onclick="loadView('admin_stats')"><i class="fas fa-chart-bar"></i> Estatísticas</a></li>
                        <li><a href="#" class="nav-link" onclick="loadView('users')"><i class="fas fa-users"></i> Usuários</a></li>
                        <li><a href="#" class="nav-link" onclick="loadView('sectors')"><i class="fas fa-building"></i> Setores</a></li>
                        <li><a href="#" class="nav-link" onclick="loadView('admin_types')"><i class="fas fa-cogs"></i> Tipos de Relatório</a></li>
                    <?php endif; ?>
                <?php endif; ?>
            </ul>
        </nav>

        <!-- Content Wrapper -->
        <div class="content-wrapper">
            <!-- Topbar -->
            <div class="topbar">
                <div class="user-info">
                    <span class="mr-2 d-none d-lg-inline text-gray-600 small">
                        Olá, <strong><?php echo htmlspecialchars($_SESSION['username']); ?></strong>
                    </span>
                    <a href="../src/api/logout.php" class="btn btn-sm btn-danger" style="margin-left: 10px;">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </a>
                </div>
            </div>

            <!-- Main Content -->
            <div class="main-content" id="main-content">
                <!-- Views will be loaded here -->
                <h2>Bem-vindo ao SysReport</h2>
                <p>Selecione uma opção no menu.</p>
            </div>
        </div>
    </div>

    <!-- LGPD Modal -->
    <div id="lgpdModal" class="modal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 10px;">
            <h2>Termos de Uso e Privacidade (LGPD)</h2>
            <p>Para continuar utilizando o sistema, você deve aceitar os termos de uso e política de privacidade.</p>
            <div style="height: 200px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px; margin: 10px 0; background: #f9f9f9;">
                <p><strong>1. Coleta de Dados:</strong> Coletamos apenas os dados necessários para o funcionamento do sistema...</p>
                <p><strong>2. Uso dos Dados:</strong> Seus dados serão utilizados apenas para fins administrativos...</p>
                <p><strong>3. Compartilhamento:</strong> Seus dados não serão compartilhados com terceiros...</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                    <input type="checkbox" id="acceptLgpdInput">
                    <span>Li e aceito os termos de uso e privacidade.</span>
                </label>
                <button id="acceptLgpdBtn" class="btn btn-success">Aceitar e Continuar</button>
            </div>
        </div>
    </div>

    <!-- Upload Modal -->
    <div id="uploadModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 50%; border-radius: 10px;">
            <span class="close" onclick="document.getElementById('uploadModal').style.display='none'" style="float:right; font-size:28px; cursor:pointer;">&times;</span>
            <h2>Novo Upload</h2>
            <form id="uploadForm">
                <div class="form-group">
                    <label for="reportType">Tipo de Relatório</label>
                    <select class="form-control" id="reportType" name="report_type_id" required>
                        <!-- Populated by JS -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="file">Arquivo (XLS/XLSX)</label>
                    <input type="file" class="form-control" id="file" name="file" accept=".xls,.xlsx" required>
                </div>
                <div id="uploadWarning" style="display:none; color: orange; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> Atenção: Já existe um arquivo deste tipo. O envio de um novo arquivará o anterior.
                </div>
                <button type="submit" class="btn">Enviar</button>
            </form>
        </div>
    </div>

    <!-- Share Modal -->
    <div id="shareModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 50%; border-radius: 10px;">
            <span class="close" onclick="document.getElementById('shareModal').style.display='none'" style="float:right; font-size:28px; cursor:pointer;">&times;</span>
            <h2>Compartilhar Relatório</h2>
            <p id="shareFileName" style="font-weight:bold;"></p>
            <div class="form-group">
                <label>Compartilhar com:</label>
                <select class="form-control" id="shareUserSelect">
                    <!-- Populated by JS -->
                </select>
                <button class="btn btn-sm btn-info" style="margin-top: 10px;" onclick="addShare()">Adicionar</button>
            </div>
            <hr>
            <h5>Usuários com acesso:</h5>
            <ul id="sharedUsersList" style="list-style: none; padding: 0;">
                <!-- Populated by JS -->
            </ul>
        </div>
    </div>

    <!-- Preview Modal -->
    <div id="previewModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);">
        <div class="modal-content" style="background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 90%; height: 90%; border-radius: 10px; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h2 id="previewTitle">Visualização</h2>
                <span class="close" onclick="document.getElementById('previewModal').style.display='none'" style="font-size:28px; cursor:pointer;">&times;</span>
            </div>
            <div id="previewContent" style="flex: 1; overflow: auto; border: 1px solid #ccc;"></div>
        </div>
    </div>

    <!-- Context Menu -->
    <div id="context-menu">
        <ul>
            <li id="ctx-preview"><i class="fas fa-eye"></i> Visualizar</li>
            <li id="ctx-download"><i class="fas fa-download"></i> Baixar (Abrir)</li>
            <li id="ctx-share"><i class="fas fa-share-alt"></i> Compartilhar</li>
            <!-- <li id="ctx-delete" style="color: red;"><i class="fas fa-trash"></i> Excluir</li> -->
        </ul>
    </div>

    <script>
        // Pass PHP session data to JS
        window.currentUser = {
            id: <?php echo $_SESSION['user_id']; ?>,
            username: '<?php echo $_SESSION['username']; ?>',
            role: '<?php echo $_SESSION['role']; ?>',
            lgpdAccepted: <?php echo $_SESSION['lgpd_accepted'] ? 'true' : 'false'; ?>
        };
    </script>
    <script type="module" src="js/main.js"></script>
</body>
</html>
