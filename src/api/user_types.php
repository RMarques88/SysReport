<?php
require_once __DIR__ . '/../auth.php';
requireAdmin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    if (!$userId) {
        http_response_code(400); 
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT rt.id, rt.name, 
                   CASE WHEN urt.user_id IS NOT NULL THEN 1 ELSE 0 END as has_access
            FROM report_types rt
            LEFT JOIN user_report_types urt ON rt.id = urt.report_type_id AND urt.user_id = ?
            ORDER BY rt.name
        ");
        $stmt->execute([$userId]);
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['user_id'] ?? null;
    $typeId = $data['report_type_id'] ?? null;
    $action = $data['action'] ?? null;
    
    if (!$userId || !$typeId || !$action) {
        http_response_code(400); echo json_encode(['success'=>false, 'message'=>'Missing params']); exit;
    }
    
    try {
        if ($action === 'grant') {
            $stmt = $pdo->prepare("INSERT IGNORE INTO user_report_types (user_id, report_type_id) VALUES (?, ?)");
            $stmt->execute([$userId, $typeId]);
            $msg = 'Granted access';
        } elseif ($action === 'revoke') {
            $stmt = $pdo->prepare("DELETE FROM user_report_types WHERE user_id = ? AND report_type_id = ?");
            $stmt->execute([$userId, $typeId]);
            $msg = 'Revoked access';
        }
        
        $logger = new Logger($pdo);
        $logger->log($_SESSION['user_id'], 'UPDATE_PERM', "$msg for user $userId to type $typeId");

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
    }
} else {
    http_response_code(405);
}
?>
