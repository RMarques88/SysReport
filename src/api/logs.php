<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

if ($_SESSION['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado.']);
    exit;
}

header('Content-Type: application/json');

try {
    $limit = $_GET['limit'] ?? 100;
    // Validate limit
    $limit = intval($limit);
    if ($limit < 1) $limit = 100;
    if ($limit > 1000) $limit = 1000;

    $stmt = $pdo->prepare("
        SELECT l.*, u.username 
        FROM logs l 
        LEFT JOIN users u ON l.user_id = u.id 
        ORDER BY l.created_at DESC 
        LIMIT $limit
    ");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
