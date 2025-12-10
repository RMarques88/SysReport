<?php
require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (login($username, $password)) {
        // Calculate the correct base path
        $scriptPath = $_SERVER['SCRIPT_NAME'];
        $documentRoot = $_SERVER['DOCUMENT_ROOT'];
        $scriptFile = $_SERVER['SCRIPT_FILENAME'];
        
        // Get the directory containing the public folder
        $publicDir = dirname(dirname($scriptFile)); // Go up from api/ to src/, then from src/ to root
        $publicDir = dirname($publicDir); // Now we're at the project root
        
        // Calculate relative path from document root to project
        $relativePath = str_replace($documentRoot, '', $publicDir);
        $relativePath = str_replace('\\', '/', $relativePath);
        
        // Build the redirect URL
        $redirect = $relativePath . '/public/index.php';
        
        echo json_encode(['success' => true, 'redirect' => $redirect]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
