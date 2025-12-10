<?php
require_once __DIR__ . '/../auth.php';
requireLogin(); // users can share or admin? User said Admin... "Permissions on the file". Assuming Admin manages it for now or Owner.
// Let's allow Admin.

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdmin(); // Only admin manages permissions for now based on context "system de permissão".
    
    $data = json_decode(file_get_contents('php://input'), true);
    $reportId = $data['report_id'] ?? null;
    $targetUserIds = $data['user_ids'] ?? [];

    if (!$reportId || empty($targetUserIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Report and Users required']);
        exit;
    }

    try {
        // Get Group ID
        $stmt = $pdo->prepare("SELECT group_id FROM reports WHERE id = ?");
        $stmt->execute([$reportId]);
        $report = $stmt->fetch();
        
        if (!$report) throw new Exception("Report not found");
        $groupId = $report['group_id'];

        $pdo->beginTransaction();

        // Optional: Clear existing shares for this group if we are "setting" the list?
        // Or just appending. Let's assume appending/toggling. 
        // User said: "User A to see User B".
        // Let's implement ADDING.
        
        $count = 0;
        foreach ($targetUserIds as $shareWithId) {
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO report_shares (report_group_id, shared_with_user_id, shared_by_user_id)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$groupId, $shareWithId, $_SESSION['user_id']]);
            $count++;
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "Shared with users successfully."]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get users who have access to this report
    $reportId = $_GET['report_id'] ?? null;
    if (!$reportId) exit;

    $stmt = $pdo->prepare("SELECT group_id FROM reports WHERE id = ?");
    $stmt->execute([$reportId]);
    $report = $stmt->fetch();
    $groupId = $report ? $report['group_id'] : '';

    $stmt = $pdo->prepare("
        SELECT u.id, u.username, rs.created_at 
        FROM report_shares rs 
        JOIN users u ON rs.shared_with_user_id = u.id 
        WHERE rs.report_group_id = ?
    ");
    $stmt->execute([$groupId]);
    echo json_encode($stmt->fetchAll());
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    requireAdmin();
    $reportId = $_GET['report_id'] ?? null; // To resolve group
    $userId = $_GET['user_id'] ?? null;

    $stmt = $pdo->prepare("SELECT group_id FROM reports WHERE id = ?");
    $stmt->execute([$reportId]);
    $groupId = $stmt->fetchColumn();

    $stmt = $pdo->prepare("DELETE FROM report_shares WHERE report_group_id = ? AND shared_with_user_id = ?");
    $stmt->execute([$groupId, $userId]);
    echo json_encode(['success' => true]);
}
?>
