<?php
require_once __DIR__ . '/../auth.php';
requireLogin();
requireAdmin(); // Helper from auth.php or ensureAdmin locally

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// Helper if not in auth.php
if (!function_exists('ensureAdmin')) {
    function ensureAdmin() {
        if ($_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Acesso negado']);
            exit;
        }
    }
}
ensureAdmin();

try {
    if ($method === 'GET') {
        $userId = $_GET['user_id'] ?? null;
        if (!$userId) {
            throw new Exception("ID do usuário obrigatório");
        }

        $stmt = $pdo->prepare("SELECT report_type_id FROM user_report_types WHERE user_id = ?");
        $stmt->execute([$userId]);
        $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode($permissions);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;
        $reportTypeIds = $data['report_type_ids'] ?? [];

        if (!$userId) {
            throw new Exception("ID do usuário obrigatório");
        }

        $pdo->beginTransaction();

        // Clear existing
        $stmt = $pdo->prepare("DELETE FROM user_report_types WHERE user_id = ?");
        $stmt->execute([$userId]);

        // Insert new
        if (!empty($reportTypeIds)) {
            $insertStmt = $pdo->prepare("INSERT INTO user_report_types (user_id, report_type_id) VALUES (?, ?)");
            foreach ($reportTypeIds as $typeId) {
                $insertStmt->execute([$userId, $typeId]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
