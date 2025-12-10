<?php
require_once __DIR__ . '/../auth.php';
requireLogin();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_SESSION['user_id'];
$currentUserRole = $_SESSION['role'] ?? 'user';

// Helper to check admin or superadmin
function ensureCanManageUsers($role) {
    if ($role !== 'admin' && $role !== 'superadmin') {
        http_response_code(403);
        echo json_encode(['error' => 'Permission denied']);
        exit;
    }
}

try {
    if ($method === 'GET') {
        ensureCanManageUsers($currentUserRole);
        
        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.email, u.role, u.created_at, u.sector_id, s.name as sector_name 
            FROM users u 
            LEFT JOIN sectors s ON u.sector_id = s.id 
            ORDER BY u.username
        ");
        $stmt->execute();
        $users = $stmt->fetchAll();
        echo json_encode($users);
    } 
    elseif ($method === 'POST') {
        // Create User
        ensureCanManageUsers($currentUserRole);
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing username or password']);
            exit;
        }

        $username = trim($data['username']);
        $password = password_hash($data['password'], PASSWORD_DEFAULT);
        $role = $data['role'] ?? 'user';
        $sectorId = $data['sector_id'] ?? null;
        $email = trim($data['email'] ?? '');

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Valid email is required']);
            exit;
        }

        // Check if exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Username already exists']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO users (username, password, email, role, sector_id) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$username, $password, $email, $role, $sectorId]);
        
        $newId = $pdo->lastInsertId();
        
        $logger = new Logger($pdo);
        $logger->log($userId, 'CREATE_USER', "Created user $username (ID: $newId)");
        
        echo json_encode(['success' => true, 'id' => $newId]);
    } 
    elseif ($method === 'PUT') {
        // Update User
        ensureCanManageUsers($currentUserRole);
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing ID']);
            exit;
        }

        $id = $data['id'];

        // Check permissions
        $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $targetUser = $stmt->fetch();
        
        if ($targetUser) {
            $targetRole = $targetUser['role'];
            if ($currentUserRole === 'admin' && $targetRole === 'superadmin') {
                http_response_code(403); echo json_encode(['error' => 'Admin cannot edit Superadmin']); exit;
            }
            // Superadmin can edit Admin
        }

        $role = $data['role'] ?? null;
        $password = !empty($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT) : null;
        $sectorId = $data['sector_id'] ?? null;

        $email = $data['email'] ?? null;

        // Build dynamic query
        $fields = [];
        $params = [];
        
        if ($password) { $fields[] = "password = ?"; $params[] = $password; }
        if ($role) { $fields[] = "role = ?"; $params[] = $role; }
        if (array_key_exists('sector_id', $data)) { $fields[] = "sector_id = ?"; $params[] = $sectorId; }
        
        if (array_key_exists('email', $data)) {
            $email = trim($data['email']);
            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Valid email is required']);
                exit;
            }
            $fields[] = "email = ?"; 
            $params[] = $email; 
        }

        if (!empty($fields)) {
            $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
            $params[] = $id;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        $logger = new Logger($pdo);
        $logger->log($userId, 'UPDATE_USER', "Updated user ID $id");

        echo json_encode(['success' => true]);
    } 
    elseif ($method === 'DELETE') {
        // Delete User
        ensureCanManageUsers($currentUserRole);
        $id = $_GET['id'] ?? null;
        if (!$id) {
            // Try body
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'] ?? null;
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing ID Create']);
            exit;
        }

        // Check permissions
        $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $targetUser = $stmt->fetch();
        
        if ($targetUser) {
            $targetRole = $targetUser['role'];
            if ($currentUserRole === 'admin' && $targetRole === 'superadmin') {
                http_response_code(403); echo json_encode(['error' => 'Admin cannot delete Superadmin']); exit;
            }
            // Superadmin can delete Admin
        }

        if ($id == $userId) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete yourself']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);

        $logger = new Logger($pdo);
        $logger->log($userId, 'DELETE_USER', "Deleted user ID $id");

        echo json_encode(['success' => true]);
    }
    else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server Error: ' . $e->getMessage()]);
}
?>
