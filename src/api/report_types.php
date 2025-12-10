<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

header('Content-Type: application/json');

$userId = $_SESSION['user_id'];

try {
    // Fetch report types assigned to the user
    // For now, let's assume all types are available or we need a table linking users to types.
    // The schema has `user_report_types`.
    
    $stmt = $pdo->prepare("
        SELECT rt.id, rt.name 
        FROM report_types rt
        JOIN user_report_types urt ON rt.id = urt.report_type_id
        WHERE urt.user_id = ?
    ");
    $stmt->execute([$userId]);
    $types = $stmt->fetchAll();

    echo json_encode($types);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
