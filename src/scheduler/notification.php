<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../Mailer.php';

// Simple Logger Helper
if (!function_exists('logNotification')) {
    function logNotification($pdo, $userId, $details) {
        try {
            $stmt = $pdo->prepare("INSERT INTO logs (user_id, action, details, ip_address) VALUES (?, 'NOTIFICATION', ?, 'SYSTEM')");
            $stmt->execute([$userId, $details]);
        } catch (Exception $e) { echo "Log Error: " . $e->getMessage() . "\n"; }
    }
}

// Check Reports
try {
    // Log Scheduler Start
    try {
        $stmt = $pdo->prepare("INSERT INTO logs (user_id, action, details, ip_address) VALUES (NULL, 'SCHEDULER', 'Notification script started', 'SYSTEM')");
        $stmt->execute();
    } catch (Exception $e) { echo "Log Error: " . $e->getMessage() . "\n"; }

    echo "Starting Notification Check...\n";

    // 1. Promote SCHEDULED -> PENDING if due in <= 10 days
    $promoteSql = "
        UPDATE reports 
        SET status = 'PENDING' 
        WHERE status = 'SCHEDULED' 
        AND DATEDIFF(due_date, CURDATE()) <= 10
    ";
    $affected = $pdo->exec($promoteSql);
    if ($affected > 0) {
        echo "Promoted $affected reports from SCHEDULED to PENDING.\n";
    }

    // 2. Notification Logic
    // 5 days before: DATEDIFF(due_date, CURDATE()) = 5
    // 3 days before: DATEDIFF(due_date, CURDATE()) = 3
    // On the day: DATEDIFF(due_date, CURDATE()) = 0
    // overdue: DATEDIFF < 0 ? (Optional)

    $sql = "
        SELECT r.id, r.due_date, r.group_id, rt.name as report_name, u.username, u.email, u.id as user_id 
        FROM reports r
        JOIN users u ON r.user_id = u.id
        JOIN report_types rt ON r.report_type_id = rt.id
        WHERE r.status = 'PENDING' 
        AND r.due_date IS NOT NULL
        AND r.is_archived = 0
        AND (
            DATEDIFF(r.due_date, CURDATE()) = 10
            OR DATEDIFF(r.due_date, CURDATE()) = 5 
            OR DATEDIFF(r.due_date, CURDATE()) = 3 
            OR DATEDIFF(r.due_date, CURDATE()) = 0
            OR (DATEDIFF(r.due_date, CURDATE()) < 0 AND MOD(ABS(DATEDIFF(r.due_date, CURDATE())), 2) = 0)
        )
    ";

    $stmt = $pdo->query($sql);
    $reports = $stmt->fetchAll();

    if (empty($reports)) {
        echo "No reports match notification criteria today.\n";
    }

    foreach ($reports as $r) {
        if (empty($r['email'])) {
            echo "Skipping User {$r['username']} (No Email)\n";
            continue;
        }

        $daysDiff = (strtotime($r['due_date']) - strtotime(date('Y-m-d'))) / (60 * 60 * 24);
        $subject = "Alerta de Prazo: Relatório {$r['report_name']}";
        
        $msg = "<p>Olá <strong>{$r['username']}</strong>,</p>";
        
        if ($daysDiff == 0) {
            $msg .= "<p class='urgent' style='color: #dc2626; font-weight: bold;'>URGENTE: O prazo para envio do relatório '{$r['report_name']}' vence HOJE!</p>";
        } elseif ($daysDiff > 0) {
            $msg .= "<p>Faltam <span style='color: #2563eb; font-weight: bold;'>{$daysDiff} dias</span> para o prazo do relatório '<strong>{$r['report_name']}</strong>'.</p>";
        } else {
            $overdueDays = abs($daysDiff);
            $subject = "URGENTE: Relatório em Atraso - {$r['report_name']}";
            $msg .= "<p class='urgent' style='color: #dc2626; font-weight: bold;'>ATENÇÃO: Seu relatório '{$r['report_name']}' está atrasado há {$overdueDays} dias!</p>";
            $msg .= "<p>Por favor, envie o mais rápido possível.</p>";
        }
        
        $msg .= "<p><strong>Data limite:</strong> " . date('d/m/Y', strtotime($r['due_date'])) . "</p>";

        // Send Email
        $mailer = new Mailer();
        $sent = $mailer->send($r['email'], $subject, $msg);
        
        if ($sent) {
            echo "Email sent to {$r['email']} [Report {$r['id']}]\n";
            logNotification($pdo, $r['user_id'], "Email sent: $subject");
        } else {
            echo "Failed to send email to {$r['email']} (Check SMTP config). [Report {$r['id']}]\n";
            echo "Content: \n$msg\n----------------\n";
            logNotification($pdo, $r['user_id'], "Email FAILED: $subject");
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
