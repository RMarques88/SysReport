<?php
session_start();
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/Logger.php';

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        // API Requests should return 401
        if (strpos($_SERVER['REQUEST_URI'], '/api/') !== false) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        // 1. Check if we are in the new structure (DocumentRoot is public)
        if (basename($_SERVER['DOCUMENT_ROOT']) === 'public') {
            header('Location: /login.php');
            exit;
        }

        // 2. Robust Relative Path Calculation
        $docRoot = $_SERVER['DOCUMENT_ROOT'];
        $projRoot = dirname(__DIR__); // /var/www/html/sysreport

        // Normalize slashes
        $docRoot = str_replace('\\', '/', $docRoot);
        $projRoot = str_replace('\\', '/', $projRoot);
        
        // Remove trailing slashes for consistency
        $docRoot = rtrim($docRoot, '/');
        $projRoot = rtrim($projRoot, '/');

        // Calculate relative path
        $relativePath = str_replace($docRoot, '', $projRoot);
        
        // Ensure leading slash if not empty
        if (!empty($relativePath) && substr($relativePath, 0, 1) !== '/') {
            $relativePath = '/' . $relativePath;
        }

        header('Location: ' . $relativePath . '/public/login.php');
        exit;
    }
}

function requireAdmin() {
    requireLogin();
    if ($_SESSION['role'] !== 'admin') {
        http_response_code(403);
        echo "Access Denied";
        exit;
    }
}

function login($username, $password) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['lgpd_accepted'] = !is_null($user['lgpd_accepted_at']);
        
        // Log login
        $logger = new Logger($pdo);
        $logger->log($user['id'], 'LOGIN', 'User logged in successfully');
        
        return true;
    }
    return false;
}

function logout() {
    global $pdo;
    if (isset($_SESSION['user_id'])) {
        $logger = new Logger($pdo);
        $logger->log($_SESSION['user_id'], 'LOGOUT', 'User logged out');
    }
    session_destroy();
}
?>
