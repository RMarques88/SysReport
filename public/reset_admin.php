<?php
require_once __DIR__ . '/../src/config/db.php';

function resetUser($pdo, $username, $password, $role) {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    try {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user) {
            $update = $pdo->prepare("UPDATE users SET password = ?, role = ? WHERE id = ?");
            $update->execute([$hash, $role, $user['id']]);
            echo ucfirst($username) . " password and role reset successfully.<br>";
        } else {
            $insert = $pdo->prepare("INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)");
            // Default email for admin/superadmin to avoid constraint violation if we enforce it later
            $email = $username . '@sysreport.local'; 
            $insert->execute([$username, $hash, $role, $email]);
            echo ucfirst($username) . " user created successfully.<br>";
        }
    } catch (PDOException $e) {
        echo "Error processing $username: " . $e->getMessage() . "<br>";
    }
}

resetUser($pdo, 'admin', 'admin', 'admin');
resetUser($pdo, 'superadmin', 'superadmin', 'superadmin');
?>
