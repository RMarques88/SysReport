<?php
require_once __DIR__ . '/../auth.php';
logout();

// Check if we are serving from public folder
if (basename($_SERVER['DOCUMENT_ROOT']) === 'public') {
    header('Location: /login.php');
    exit;
}

// Calculate correct base path for legacy structure
$docRoot = $_SERVER['DOCUMENT_ROOT'];
$scriptFile = $_SERVER['SCRIPT_FILENAME'];

// Get the project root directory (from src/api/ go up twice)
$projRoot = dirname(dirname(dirname($scriptFile)));

// Normalize slashes
$docRoot = str_replace('\\', '/', $docRoot);
$projRoot = str_replace('\\', '/', $projRoot);

// Remove trailing slashes
$docRoot = rtrim($docRoot, '/');
$projRoot = rtrim($projRoot, '/');

// Calculate relative path from document root
$relativePath = str_replace($docRoot, '', $projRoot);

// Ensure leading slash if not empty
if (!empty($relativePath) && substr($relativePath, 0, 1) !== '/') {
    $relativePath = '/' . $relativePath;
}

header('Location: ' . $relativePath . '/public/login.php');
exit;
?>
