<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_SESSION['user_id'];
    
    try {
        $stmt = $pdo->prepare("UPDATE users SET lgpd_accepted_at = NOW() WHERE id = ?");
        $stmt->execute([$userId]);
        
        // Update session
        $_SESSION['lgpd_accepted'] = true;
        
        // Log
        $logger = new Logger($pdo);
        $logger->log($userId, 'LGPD_ACCEPT', 'User accepted LGPD terms');
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
