import { initNavigation, loadView } from './modules/navigation.js';
import { loadAdminDashboard, fetchAdminReports, renderAdminReportsTable, openHistoryModal, rejectReport, loadArchivedReportsView, fetchArchivedReports, replaceFile } from './modules/sections/adminDashboard.js';
import { loadSuperAdminDashboard, openSettingsModal, saveSettings, downloadDbBackup, downloadFullBackup } from './modules/sections/superAdminDashboard.js';
import { loadAdminStatsView } from './modules/sections/adminStats.js';
import { openShareModal, removeShare } from './modules/sections/sharing.js';
import { openEditReportModal, handleEditReport, deleteReport, archiveReport, unarchiveReport } from './modules/sections/reports.js';
import { loadUserDashboard, renderUserReports, loadUserArchivedReports } from './modules/sections/userDashboard.js';
import { openAssignmentModal, assignmentActions } from './modules/sections/assignment.js';
import { openUploadModal } from './modules/sections/upload.js';
import { loadAdminTypesView, openTypeModal, deleteType } from './modules/sections/reportTypes.js';
import { loadUsersView, openUserModal, deleteUser } from './modules/sections/users.js';
import { loadLogsView } from './modules/sections/logs.js';
import { loadSectorsView, openSectorModal, deleteSector } from './modules/sections/sectors.js';
import { previewReport, changeSheet } from './modules/sections/preview.js';
import './modules/lgpd.js';

// Fix SweetAlert2 layout shifting
if (window.Swal) {
    window.Swal = window.Swal.mixin({
        scrollbarPadding: false,
        heightAuto: false
    });
}

// Expose functions used by inline onclicks or dynamically built HTML
window.App = {
    // Navigation
    loadView,

    // Admin dashboard
    loadAdminDashboard,
    fetchAdminReports,
    renderAdminReportsTable,
    openHistoryModal,
    rejectReport,
    loadArchivedReportsView,
    fetchArchivedReports,
    replaceFile,
    openSettingsModal,
    saveSettings,
    loadSuperAdminDashboard,
    loadAdminStatsView,
    downloadDbBackup,
    downloadFullBackup,

    // Sharing
    openShareModal,
    removeShare,

    // Reports
    openEditReportModal,
    handleEditReport,
    deleteReport,
    archiveReport,
    unarchiveReport,

    // Assignment
    openAssignmentModal,
    ...assignmentActions,

    // Upload
    openUploadModal,

    // Types
    loadAdminTypesView,
    openTypeModal,
    deleteType,

    // Users
    loadUsersView,
    openUserModal,
    deleteUser,

    // Sectors
    loadSectorsView,
    openSectorModal,
    deleteSector,

    // Logs
    loadLogsView,

    // User dashboard
    loadUserDashboard,
    renderUserReports,
    loadUserArchivedReports,

    // Preview
    previewReport,
    changeSheet,
};

// Init application navigation and LGPD handling
initNavigation();

// Handle edit report form if present
const editForm = document.getElementById('editReportForm');
if (editForm) {
    editForm.addEventListener('submit', handleEditReport);
}

// Global shims for legacy inline onclicks
window.loadView = loadView;
window.openAssignmentModal = openAssignmentModal;
window.openShareModal = openShareModal;
window.openEditReportModal = openEditReportModal;
window.previewReport = previewReport;
window.rejectReport = rejectReport;
window.deleteReport = deleteReport;
window.archiveReport = archiveReport;
window.unarchiveReport = unarchiveReport;
window.loadAdminTypesView = loadAdminTypesView;
window.openTypeModal = openTypeModal;
window.deleteType = deleteType;
window.loadUsersView = loadUsersView;
window.openUserModal = openUserModal;
window.deleteUser = deleteUser;
window.loadLogsView = loadLogsView;
window.loadUserDashboard = loadUserDashboard;
window.renderUserReports = renderUserReports;
window.openSettingsModal = openSettingsModal;
window.saveSettings = saveSettings;
window.downloadDbBackup = downloadDbBackup;
window.downloadFullBackup = downloadFullBackup;
