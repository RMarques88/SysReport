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

// Normalize slashes and remove trailing slashes
$docRoot = rtrim(str_replace('\\', '/', $docRoot), '/');
$projRoot = rtrim(str_replace('\\', '/', $projRoot), '/');

// Case A: We are serving from public folder directly (VirtualHost)
if (substr($docRoot, -7) === '/public') {
    header('Location: /login.php');
    exit;
}

// Case B: Standard Subfolder Setup
if (strpos($projRoot, $docRoot) === 0) {
    $relativePath = substr($projRoot, strlen($docRoot));
    header('Location: ' . $relativePath . '/public/login.php');
    exit;
}

header('Location: /login.php');
exit;
?>
