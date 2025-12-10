<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

header('Content-Type: application/json');

// Only admin can manage sectors
if ($_SESSION['role'] !== 'admin' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("SELECT * FROM sectors ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (isset($data['action']) && $data['action'] === 'delete') {
            $stmt = $pdo->prepare("DELETE FROM sectors WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
        } else {
            // Create or Update
            $name = $data['name'] ?? '';
            $desc = $data['description'] ?? '';
            $id = $data['id'] ?? null;

            if (!$name) throw new Exception("Name required");

            if ($id) {
                $stmt = $pdo->prepare("UPDATE sectors SET name = ?, description = ? WHERE id = ?");
                $stmt->execute([$name, $desc, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO sectors (name, description) VALUES (?, ?)");
                $stmt->execute([$name, $desc]);
            }
            echo json_encode(['success' => true]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
