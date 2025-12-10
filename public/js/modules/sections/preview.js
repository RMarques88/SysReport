import { getProjectBaseUrl } from '../../core/base.js';

let currentWorkbook = null;
let currentSheetIndex = 0;

export async function previewReport(arg1, arg2) {
    let filename, originalName;

    // Handle object argument (from User Dashboard) or string arguments (Legacy/Admin)
    if (typeof arg1 === 'object' && arg1 !== null) {
        filename = arg1.file_path || arg1.filename;
        originalName = arg1.original_filename || 'Visualização';
    } else {
        filename = arg1;
        originalName = arg2;
    }

    // Check if modal exists but is outdated (missing toolbar)
    const existingModal = document.getElementById('previewModal');
    if (existingModal && !document.getElementById('previewToolbar')) {
        existingModal.remove();
    }

    if (!document.getElementById('previewModal')) {
        const modalHtml = `
            <div id="previewModal" class="modal">
                <style>
                    /* Modal Window Styling */
                    #previewModal .modal-content {
                        border-radius: 12px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        overflow: hidden;
                        border: 1px solid #e5e7eb;
                        background: #f8fafc;
                    }
                    
                    /* Header */
                    #previewModal .modal-header {
                        background: #ffffff;
                        padding: 1rem 1.5rem;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    #previewTitle {
                        color: #1e293b;
                        font-weight: 600;
                        font-size: 1.1rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    #previewTitle::before {
                        content: '\\f1c3'; /* File Excel Icon fallback */
                        font-family: 'Font Awesome 5 Free';
                        font-weight: 400;
                        color: #10b981;
                    }

                    /* Toolbar */
                    #previewToolbar {
                        background: #ffffff;
                        padding: 0.5rem 1rem;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 1rem;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        z-index: 10;
                    }
                    #sheetName {
                        font-family: 'Inter', sans-serif;
                        color: #475569;
                        font-size: 0.9rem;
                        background: #f1f5f9;
                        padding: 0.35rem 1.2rem;
                        border-radius: 20px;
                        border: 1px solid #e2e8f0;
                        font-weight: 600;
                    }

                    /* Content Area */
                    #previewModal .modal-body {
                        background: #f1f5f9; /* Canvas background */
                        padding: 1.5rem;
                        flex: 1;
                        overflow: auto;
                    }
                    #previewContent {
                        background: white;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        border-radius: 8px;
                        overflow: auto; /* Scroll inside the white box */
                        min-height: 100%;
                    }

                    /* Table Styling */
                    #previewContent table {
                        border-collapse: collapse;
                        width: 100%;
                        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        font-size: 13px;
                        color: #334155;
                    }
                    #previewContent table td, #previewContent table th {
                        border: 1px solid #cbd5e1;
                        padding: 8px 12px;
                        white-space: nowrap;
                    }
                    #previewContent table th {
                        background-color: #f8fafc;
                        font-weight: 700;
                        color: #1e293b;
                        text-align: left;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    #previewContent table tr:nth-child(even) {
                        background-color: #fcfcfc;
                    }
                    #previewContent table tr:hover {
                        background-color: #e0f2fe; /* Light blue hover */
                    }
                </style>
                <div class="modal-content" style="width: 90%; height: 90%; display: flex; flex-direction: column;">
                    <div class="modal-header">
                        <h2 id="previewTitle" style="margin:0; font-size: 1.2rem;"></h2>
                        <button class="close" onclick="document.getElementById('previewModal').style.display='none'">&times;</button>
                    </div>
                    <div id="previewToolbar" class="d-flex justify-center align-center gap-2 p-2 bg-gray-100 border-b" style="display:none;">
                        <button class="btn btn-sm btn-secondary" onclick="window.App.changeSheet(-1)"><i class="fas fa-chevron-left"></i></button>
                        <span id="sheetName" style="font-weight:bold; min-width: 150px; text-align:center;">Sheet 1</span>
                        <button class="btn btn-sm btn-secondary" onclick="window.App.changeSheet(1)"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="modal-body" style="flex: 1; overflow: auto; padding: 0;">
                        <div id="previewContent" style="padding: 1rem;"></div>
                    </div>
                </div>
            </div>
         `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    const toolbar = document.getElementById('previewToolbar');
    
    document.getElementById('previewTitle').textContent = originalName;
    content.innerHTML = '<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Carregando visualização...</div>';
    toolbar.style.display = 'none';
    modal.style.display = 'flex'; 

    if (!filename) {
        content.innerHTML = '<div class="text-center text-muted p-4">Este relatório ainda não possui arquivo para visualização.</div>';
        return;
    }

    // Normalize path
    let cleanFilename = filename;
    if (cleanFilename.startsWith('uploads/')) {
        cleanFilename = cleanFilename.replace('uploads/', '');
    } else if (cleanFilename.startsWith('src/uploads/')) {
        cleanFilename = cleanFilename.replace('src/uploads/', '');
    }

    const url = getProjectBaseUrl() + '/uploads/' + cleanFilename;
    const ext = cleanFilename.split('.').pop().toLowerCase();

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('File not found');
        const blob = await response.blob();

        if (ext === 'docx') {
            content.innerHTML = ''; // Clear spinner
            // Use docx-preview
            const docxOptions = {
                className: "docx-wrapper",
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                ignoreFonts: false,
                breakPages: true,
                ignoreLastRenderedPageBreak: true,
                experimental: false,
                trimXmlDeclaration: true,
                useBase64URL: false,
                useMathMLPolyfill: false,
                debug: false,
            };
            await docx.renderAsync(blob, content, null, docxOptions);
        } 
        else if (ext === 'doc') {
            content.innerHTML = `
                <div class="text-center p-5">
                    <i class="fas fa-file-word fa-3x text-blue-600 mb-3"></i>
                    <h3>Visualização não disponível</h3>
                    <p>Arquivos .doc antigos não podem ser visualizados no navegador.</p>
                    <a href="${url}" class="btn btn-primary mt-2" download="${originalName}">
                        <i class="fas fa-download"></i> Baixar Arquivo
                    </a>
                </div>
            `;
        }
        else if (['xls', 'xlsx'].includes(ext)) {
            const arrayBuffer = await blob.arrayBuffer();
            currentWorkbook = XLSX.read(arrayBuffer, { type: 'array' });
            currentSheetIndex = 0;
            
            if (currentWorkbook.SheetNames.length > 0) {
                renderCurrentSheet();
                if (currentWorkbook.SheetNames.length > 1) {
                    toolbar.style.display = 'flex';
                }
            } else {
                content.innerHTML = '<div class="text-center text-muted">Arquivo Excel vazio.</div>';
            }
        } else {
            content.innerHTML = '<div class="text-center text-muted">Formato não suportado para visualização.</div>';
        }

    } catch (e) {
        console.error(e);
        content.innerHTML = '<div class="text-center text-danger p-4">Erro ao carregar visualização.<br>O arquivo pode não existir ou estar corrompido.</div>';
    }
}

export function changeSheet(direction) {
    if (!currentWorkbook) return;
    
    const newIndex = currentSheetIndex + direction;
    if (newIndex >= 0 && newIndex < currentWorkbook.SheetNames.length) {
        currentSheetIndex = newIndex;
        renderCurrentSheet();
    }
}

function renderCurrentSheet() {
    const content = document.getElementById('previewContent');
    const sheetNameEl = document.getElementById('sheetName');
    
    const sheetName = currentWorkbook.SheetNames[currentSheetIndex];
    const worksheet = currentWorkbook.Sheets[sheetName];
    const html = XLSX.utils.sheet_to_html(worksheet, { class: 'table table-striped table-bordered' });
    
    content.innerHTML = html;
    sheetNameEl.textContent = `${sheetName} (${currentSheetIndex + 1}/${currentWorkbook.SheetNames.length})`;
}
