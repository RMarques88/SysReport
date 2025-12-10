<?php
require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (login($username, $password)) {
        // Calculate correct base path
        $docRoot = $_SERVER['DOCUMENT_ROOT'];
        $scriptFile = $_SERVER['SCRIPT_FILENAME'];

        // Get the project root directory (from src/api/ go up twice)
        $projRoot = dirname(dirname(dirname($scriptFile)));

        // Normalize slashes and remove trailing slashes
        $docRoot = rtrim(str_replace('\\', '/', $docRoot), '/');
        $projRoot = rtrim(str_replace('\\', '/', $projRoot), '/');

        $redirectUrl = '/index.php'; // Default fallback

        // Case A: We are serving from public folder directly (VirtualHost)
        if (substr($docRoot, -7) === '/public') {
            $redirectUrl = '/index.php';
        }
        // Case B: Standard Subfolder Setup
        elseif (strpos($projRoot, $docRoot) === 0) {
            $relativePath = substr($projRoot, strlen($docRoot));
            $redirectUrl = $relativePath . '/public/index.php';
        }
        
        echo json_encode(['success' => true, 'redirect' => $redirectUrl]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
