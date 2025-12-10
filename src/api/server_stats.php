<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

// Only superadmin can access this
if ($_SESSION['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(['error' => 'Access Denied']);
    exit;
}

header('Content-Type: application/json');

try {
    // 1. Disk Usage
    $diskTotal = disk_total_space(".");
    $diskFree = disk_free_space(".");
    $diskUsed = $diskTotal - $diskFree;

    // 2. Uploads Folder Size
    $uploadsDir = __DIR__ . '/../../uploads';
    $uploadsSize = 0;
    if (is_dir($uploadsDir)) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($uploadsDir));
        foreach ($iterator as $file) {
            $uploadsSize += $file->getSize();
        }
    }

    // 3. CPU Load (Windows specific attempt, fallback to mock)
    $cpuLoad = 0;
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Try wmic
        $cmd = "wmic cpu get loadpercentage";
        @exec($cmd, $output);
        if (isset($output[1])) {
            $cpuLoad = intval($output[1]);
        }
    } else {
        $load = sys_getloadavg();
        $cpuLoad = $load[0] * 100; // Rough estimate
    }

    // 4. Database Stats
    // Total Reports
    $stmt = $pdo->query("SELECT COUNT(*) FROM reports");
    $totalReports = $stmt->fetchColumn();

    // Sent Reports (Submitted or Approved)
    $stmt = $pdo->query("SELECT COUNT(*) FROM reports WHERE status IN ('SUBMITTED', 'APPROVED')");
    $sentReports = $stmt->fetchColumn();

    // Pending Reports
    $stmt = $pdo->query("SELECT COUNT(*) FROM reports WHERE status = 'PENDING'");
    $pendingReports = $stmt->fetchColumn();

    // Rejected Reports
    $stmt = $pdo->query("SELECT COUNT(*) FROM reports WHERE status = 'REJECTED'");
    $rejectedReports = $stmt->fetchColumn();

    // Archived Reports
    $stmt = $pdo->query("SELECT COUNT(*) FROM reports WHERE is_archived = 1");
    $archivedReports = $stmt->fetchColumn();

    echo json_encode([
        'disk' => [
            'total' => $diskTotal,
            'free' => $diskFree,
            'used' => $diskUsed,
            'uploads_size' => $uploadsSize
        ],
        'cpu' => $cpuLoad,
        'reports' => [
            'total' => $totalReports,
            'sent' => $sentReports,
            'pending' => $pendingReports,
            'rejected' => $rejectedReports,
            'archived' => $archivedReports
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
