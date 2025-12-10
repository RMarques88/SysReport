<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $reportId = $data['report_id'] ?? null;
    $targetUserId = $data['target_user_id'] ?? null;
    $action = $data['action'] ?? 'share'; // share or unshare

    if (!$reportId || !$targetUserId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing parameters']);
        exit;
    }

    $userId = $_SESSION['user_id'];

    try {
        // Verify ownership
        $stmt = $pdo->prepare("SELECT group_id, user_id FROM reports WHERE id = ?");
        $stmt->execute([$reportId]);
        $report = $stmt->fetch();

        if (!$report || $report['user_id'] != $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Permission denied']);
            exit;
        }

        if ($action === 'share') {
            $stmt = $pdo->prepare("INSERT IGNORE INTO report_shares (report_group_id, shared_with_user_id, shared_by_user_id) VALUES (?, ?, ?)");
            $stmt->execute([$report['group_id'], $targetUserId, $userId]);
            $msg = 'Report shared successfully';
        } else {
            $stmt = $pdo->prepare("DELETE FROM report_shares WHERE report_group_id = ? AND shared_with_user_id = ?");
            $stmt->execute([$report['group_id'], $targetUserId]);
            $msg = 'Report unshared successfully';
        }

        // Log
        $logger = new Logger($pdo);
        $logger->log($userId, strtoupper($action), "Report group {$report['group_id']} with user $targetUserId");

        echo json_encode(['success' => true, 'message' => $msg]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $reportId = $_GET['report_id'] ?? null;
    if (!$reportId) {
        http_response_code(400);
        exit;
    }

    $userId = $_SESSION['user_id'];
    
    try {
        // Get group_id
        $stmt = $pdo->prepare("SELECT group_id, user_id FROM reports WHERE id = ?");
        $stmt->execute([$reportId]);
        $report = $stmt->fetch();

        if (!$report || $report['user_id'] != $userId) {
            http_response_code(403);
            exit;
        }

        // Get shared users
        $stmt = $pdo->prepare("
            SELECT u.id, u.username 
            FROM report_shares rs
            JOIN users u ON rs.shared_with_user_id = u.id
            WHERE rs.report_group_id = ?
        ");
        $stmt->execute([$report['group_id']]);
        $users = $stmt->fetchAll();

        echo json_encode($users);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
}
?>
