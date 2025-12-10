<?php
require_once __DIR__ . '/config/db.php';

class Logger {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function log($userId, $action, $details = null) {
        $stmt = $this->pdo->prepare("INSERT INTO logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $stmt->execute([$userId, $action, $details, $ip]);
    }
}
?>
