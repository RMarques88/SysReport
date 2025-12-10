<?php
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../Mailer.php';
requireLogin();

header('Content-Type: application/json');

// Helper to handle recurrence
function checkAndCreateRecurrence($pdo, $reportId) {
    try {
        // Fetch current report details
        $stmt = $pdo->prepare("SELECT * FROM reports WHERE id = ?");
        $stmt->execute([$reportId]);
        $report = $stmt->fetch();

        if ($report && !empty($report['recurrence_days']) && $report['recurrence_days'] > 0) {
            // Calculate new due date based on OLD due date to maintain cycle
            $baseDate = $report['due_date'] ? $report['due_date'] : date('Y-m-d');
            $nextDueDate = date('Y-m-d', strtotime($baseDate . " + " . $report['recurrence_days'] . " days"));
            
            // If the calculated next due date is still in the past (crazy late), should we jump valid? 
            // User said "não adia", so strict cycle. Warning: User might get immediate new pending if very late.
            
            // Use the SAME group_id to keep them linked in the UI
            $newGroupId = $report['group_id'];

            $insert = $pdo->prepare("
                INSERT INTO reports 
                (user_id, report_type_id, group_id, status, version, is_active, due_date, description, recurrence_days) 
                VALUES (?, ?, ?, 'SCHEDULED', 0, 1, ?, ?, ?)
            ");
            $insert->execute([
                $report['user_id'],
                $report['report_type_id'],
                $newGroupId,
                $nextDueDate,
                $report['description'], 
                $report['recurrence_days']
            ]);
        }
    } catch (Exception $e) {
        error_log("Recurrence creation failed: " . $e->getMessage());
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_SESSION['user_id'];
    $reportId = $_POST['report_id'] ?? null;
    
    if (!isset($_FILES['file']) || !$reportId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Arquivo ou referência do relatório ausente']);
        exit;
    }

    $file = $_FILES['file'];
    
    // Validate file type
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['xls', 'xlsx', 'doc', 'docx'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Formato de arquivo inválido. Apenas XLS, XLSX, DOC e DOCX são permitidos.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Get the current report update info
        // We need the User Email for notification
        // If Admin/Superadmin, they can upload to any report
        $role = $_SESSION['role'];
        
        if ($role === 'admin' || $role === 'superadmin') {
             $stmt = $pdo->prepare("
                SELECT r.*, u.email, u.username 
                FROM reports r 
                JOIN users u ON r.user_id = u.id 
                WHERE r.id = ?
            ");
            $stmt->execute([$reportId]);
        } else {
            $stmt = $pdo->prepare("
                SELECT r.*, u.email, u.username 
                FROM reports r 
                JOIN users u ON r.user_id = u.id 
                WHERE r.id = ? AND r.user_id = ?
            ");
            $stmt->execute([$reportId, $userId]);
        }

        $currentReport = $stmt->fetch();

        if (!$currentReport) {
            throw new Exception("Solicitação de relatório não encontrada ou acesso negado.");
        }

        // 2. Prepare File
        $uploadDir = __DIR__ . '/../../uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $newFilename = time() . '_' . basename($file['name']);
        $targetPath = $uploadDir . $newFilename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new Exception("Falha ao salvar o arquivo.");
        }

        // 3. Logic:
        $msg = '';
        if ($currentReport['status'] === 'PENDING') {
            // First time submit
            $stmt = $pdo->prepare("
                UPDATE reports 
                SET filename = ?, original_filename = ?, file_path = ?, status = 'SUBMITTED', version = 1, created_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$file['name'], $file['name'], $newFilename, $reportId]);
            
            checkAndCreateRecurrence($pdo, $reportId);
            $msg = "Relatório enviado com sucesso.";
            
        } else {
            // New Version
            $stmt = $pdo->prepare("UPDATE reports SET is_active = 0 WHERE group_id = ?");
            $stmt->execute([$currentReport['group_id']]);
            
            $newVersion = $currentReport['version'] + 1;
            
            $stmt = $pdo->prepare("
                INSERT INTO reports 
                (user_id, report_type_id, group_id, filename, original_filename, file_path, status, version, is_active, description, recurrence_days, due_date)
                VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, 1, ?, ?, ?)
            ");
            $stmt->execute([
                $currentReport['user_id'], 
                $currentReport['report_type_id'], 
                $currentReport['group_id'], 
                $file['name'], 
                $file['name'], 
                $newFilename, 
                $newVersion,
                $currentReport['description'],
                $currentReport['recurrence_days'],
                $currentReport['due_date']
            ]);
            $msg = "Nova versão ($newVersion) enviada com sucesso.";
        }
        
        // Log
        $logger = new Logger($pdo);
        $logger->log($userId, 'UPLOAD', "Uploaded report {$currentReport['group_id']}");

        $pdo->commit();

        // 4. Send Confirmation Email
        if (!empty($currentReport['email'])) {
            $subject = "Confirmação de Envio: " . $currentReport['original_filename'];
            $body = "<p>Olá <strong>{$currentReport['username']}</strong>,</p>";
            $body .= "<p>Recebemos o arquivo '<strong>{$file['name']}</strong>' com sucesso.</p>";
            $body .= "<p>Status: <span style='color: #2563eb; font-weight: bold;'>ENVIADO</span></p>";
            
            $mailer = new Mailer();
            $mailer->send($currentReport['email'], $subject, $body);
        }

        echo json_encode(['success' => true, 'message' => $msg]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} else {
    http_response_code(405);
}
?>
