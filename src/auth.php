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
        $docRoot = $_SERVER['DOCUMENT_ROOT']; // e.g. /var/www/html
        $projRoot = dirname(__DIR__);         // e.g. /var/www/html/sysreport

        // Normalize slashes
        $docRoot = str_replace('\\', '/', $docRoot);
        $projRoot = str_replace('\\', '/', $projRoot);
        
        // Remove trailing slashes
        $docRoot = rtrim($docRoot, '/');
        $projRoot = rtrim($projRoot, '/');

        // Case A: We are serving from public folder directly (VirtualHost)
        // If the document root ENDS with /public, we assume we are in the new structure
        if (substr($docRoot, -7) === '/public') {
             header('Location: /login.php');
             exit;
        }

        // Case B: Standard Subfolder Setup
        // If project root starts with document root, we can subtract it
        if (strpos($projRoot, $docRoot) === 0) {
            $relativePath = substr($projRoot, strlen($docRoot));
            header('Location: ' . $relativePath . '/public/login.php');
            exit;
        }
        
        // Case C: Fallback - if all else fails, try to guess based on script name
        // This is often safer than path subtraction if paths are weird (symlinks/aliases)
        $scriptName = $_SERVER['SCRIPT_NAME']; // e.g. /sysreport/public/index.php
        $dirName = dirname($scriptName);       // e.g. /sysreport/public
        
        // If we are already in public, go to login.php in same dir
        if (basename($dirName) === 'public') {
             header('Location: ' . $dirName . '/login.php');
             exit;
        }
        
        // If we are in src/api, we need to go up to public
        // But this function is usually called from index.php or similar entry points
        
        // Ultimate Fallback: Hardcoded relative path if we know the folder name
        // But let's try to just use the current location context
        header('Location: ./login.php'); 
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
