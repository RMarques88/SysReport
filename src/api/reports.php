<?php
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../Mailer.php';
requireLogin();

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

    // ... (Existing GET logic starts around line 9) ...
    $action = $_GET['action'] ?? '';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        
        if ($action === 'history') {
             // Fetch history for a group
             $groupId = $_GET['group_id'] ?? '';
             if (!$groupId) {
                 echo json_encode([]); exit;
             }
             // Get all versions (active and inactive) for this group
             $stmt = $pdo->prepare("
                SELECT r.*, u.username as owner_name 
                FROM reports r 
                JOIN users u ON r.user_id = u.id 
                WHERE r.group_id = ? 
                ORDER BY r.created_at DESC, r.version DESC
             ");
             $stmt->execute([$groupId]);
             echo json_encode($stmt->fetchAll());
             exit;
        }

        $userId = $_SESSION['user_id'];
    // ... (Rest of existing GET logic) ...

    $role = $_SESSION['role'];
    
    // Filters
    $filterStatus = $_GET['status'] ?? '';
    $filterUser = $_GET['user_id'] ?? '';
    $filterType = $_GET['type_id'] ?? '';
    $filterSector = $_GET['sector_id'] ?? '';
    $filterArchived = $_GET['archived'] ?? 'false';

    try {
        if ($role === 'admin') {
            // Admin sees ALL reports (latest version per group)
            $baseSql = "
                SELECT 
                    r.id, r.group_id, 
                    CASE WHEN r.status = 'SCHEDULED' THEN 'PENDING' ELSE r.status END as status,
                    r.version, r.created_at, r.due_date, r.recurrence_days, r.description,
                    r.filename, r.file_path, r.original_filename, r.is_archived,
                    rt.name as report_type, rt.id as report_type_id,
                    u.username as owner_name, u.id as owner_id,
                    s.name as sector_name, s.id as sector_id
                FROM reports r
                JOIN (
                    SELECT 
                        group_id,
                        SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY 
                            CASE 
                                WHEN status IN ('PENDING', 'SCHEDULED') THEN 1 
                                ELSE 0 
                            END DESC, 
                            version DESC, 
                            id DESC
                        ), ',', 1) as max_id
                    FROM reports
                    GROUP BY group_id
                ) latest ON r.id = latest.max_id
                JOIN report_types rt ON r.report_type_id = rt.id
                JOIN users u ON r.user_id = u.id
                LEFT JOIN sectors s ON u.sector_id = s.id
            ";

            $params = [];
            $filtersSql = '';
            if ($filterStatus) { $filtersSql .= " AND r.status = ?"; $params[] = $filterStatus; }
            if ($filterUser) { $filtersSql .= " AND r.user_id = ?"; $params[] = $filterUser; }
            if ($filterType) { $filtersSql .= " AND r.report_type_id = ?"; $params[] = $filterType; }
            if ($filterSector) { $filtersSql .= " AND u.sector_id = ?"; $params[] = $filterSector; }
            
            if ($filterArchived === 'true') {
                $filtersSql .= " AND r.is_archived = 1";
            } else {
                $filtersSql .= " AND r.is_archived = 0";
            }

            $finalSql = $baseSql . " WHERE 1=1 " . $filtersSql . " ORDER BY r.created_at DESC";
            
            $stmt = $pdo->prepare($finalSql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll();
            
        } else {
            // User sees THEIR reports (Assigned/Submitted)
            $baseSql = "
                SELECT 
                    r.id, r.group_id, 
                    CASE WHEN r.status = 'SCHEDULED' THEN 'PENDING' ELSE r.status END as status,
                    r.version, r.created_at, r.due_date, r.recurrence_days, r.description,
                    r.filename, r.file_path, r.original_filename, r.template_filename, r.template_path,
                    rt.name as report_type, rt.id as report_type_id,
                    u.username as owner_name, r.user_id,
                    s.name as sector_name, s.id as sector_id,
                    CASE WHEN r.user_id != ? THEN 1 ELSE 0 END as is_shared
                FROM reports r
                JOIN (
                    SELECT 
                        group_id,
                        SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY 
                            CASE 
                                WHEN status IN ('PENDING', 'SCHEDULED') THEN 1 
                                ELSE 0 
                            END DESC, 
                            version DESC, 
                            id DESC
                        ), ',', 1) as max_id
                    FROM reports
                    GROUP BY group_id
                ) latest ON r.id = latest.max_id
                JOIN report_types rt ON r.report_type_id = rt.id
                JOIN users u ON r.user_id = u.id
                LEFT JOIN sectors s ON u.sector_id = s.id
                WHERE (r.user_id = ? OR r.group_id IN (SELECT report_group_id FROM report_shares WHERE shared_with_user_id = ?))
            ";

            $params = [$userId, $userId, $userId];
            // Show SCHEDULED reports (we will handle display in frontend)
            $filtersSql = "";
            
            if ($filterStatus) { $filtersSql .= " AND r.status = ?"; $params[] = $filterStatus; }
            if ($filterSector) { $filtersSql .= " AND u.sector_id = ?"; $params[] = $filterSector; }
            
            if ($filterArchived === 'true') {
                $filtersSql .= " AND r.is_archived = 1";
            } else {
                $filtersSql .= " AND r.is_archived = 0";
            }

            $finalSql = $baseSql . $filtersSql . " ORDER BY r.created_at DESC";
            
            $stmt = $pdo->prepare($finalSql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll();
        }

        echo json_encode($reports);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Admin ASSIGNS report to User(s)
    requireAdmin();
    
    // Check if it's JSON (old way) or FormData (new way)
    // Since we now support files, we expect FormData (POST entries)
    $reportTypeId = $_POST['report_type_id'] ?? null;
    $targetUserIdsStr = $_POST['user_ids'] ?? ''; // Expecting comma-separated or array
    // Handling array passed as string or actual array support in FormData is tricky in JS->PHP.
    // Simplest is to pass JSON string in a field 'user_ids_json' or comma separated.
    // Let's assume we will pass 'user_ids' as a JSON string from frontend to be safe.
    $targetUserIdsRaw = $_POST['user_ids'] ?? '[]';
    $targetUserIds = json_decode($targetUserIdsRaw, true);
    if (!is_array($targetUserIds)) {
        // Fallback if it came as simple POST array
        $targetUserIds = $_POST['user_ids'] ?? [];
    }

    $dueDate = $_POST['due_date'] ?? null;
    $description = $_POST['description'] ?? '';
    $recurrenceDays = isset($_POST['recurrence_days']) && is_numeric($_POST['recurrence_days']) ? (int)$_POST['recurrence_days'] : null;

    // Default Due Date: 7 days from now if empty
    if (!$dueDate) {
        $dueDate = date('Y-m-d', strtotime('+7 days'));
    }

    if (!$reportTypeId || empty($targetUserIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Report Type and Users are required']);
        exit;
    }

    // Handle Template Upload
    $templateFilename = null;
    $templatePath = null;

    if (isset($_FILES['template_file']) && $_FILES['template_file']['error'] === UPLOAD_ERR_OK) {
        $tFile = $_FILES['template_file'];
        $ext = strtolower(pathinfo($tFile['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['xls', 'xlsx', 'doc', 'docx', 'pdf', 'txt'])) {
             // Allow broader types for templates? Just typical office files.
        }
        
        $uploadDir = __DIR__ . '/../../uploads/templates/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $newFilename = 'tpl_' . time() . '_' . basename($tFile['name']);
        if (move_uploaded_file($tFile['tmp_name'], $uploadDir . $newFilename)) {
            $templateFilename = $tFile['name'];
            $templatePath = 'uploads/templates/' . $newFilename; 
            // Better store relative to 'uploads' so download logic is consistent.
        }
    }

    try {
        $pdo->beginTransaction();
        
        // Get Report Type Name
        $stmt = $pdo->prepare("SELECT name FROM report_types WHERE id = ?");
        $stmt->execute([$reportTypeId]);
        $rt = $stmt->fetch();
        $reportTypeName = $rt ? $rt['name'] : 'Relatório';

        $mailer = new Mailer();

        $count = 0;
        foreach ($targetUserIds as $targetId) {
            // Create "Pending" report assignment
            $groupId = uniqid();
            $stmt = $pdo->prepare("
                INSERT INTO reports 
                (user_id, report_type_id, group_id, status, version, is_active, due_date, description, recurrence_days, template_filename, template_path) 
                VALUES (?, ?, ?, 'PENDING', 0, 1, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $targetId, 
                $reportTypeId, 
                $groupId, 
                $dueDate, 
                $description, 
                $recurrenceDays,
                $templateFilename,
                $templatePath
            ]);

            // Send Notification Email
            $stmt = $pdo->prepare("SELECT username, email FROM users WHERE id = ?");
            $stmt->execute([$targetId]);
            $user = $stmt->fetch();

            if ($user && !empty($user['email'])) {
                $subject = "Novo Relatório Solicitado: $reportTypeName";
                $body = "<p>Olá <strong>{$user['username']}</strong>,</p>";
                $body .= "<p>Um novo relatório foi solicitado e aguarda seu envio.</p>";
                $body .= "<p><strong>Relatório:</strong> $reportTypeName</p>";
                $body .= "<p><strong>Prazo:</strong> " . date('d/m/Y', strtotime($dueDate)) . "</p>";
                if (!empty($description)) {
                    $body .= "<p><strong>Descrição:</strong> " . nl2br(htmlspecialchars($description)) . "</p>";
                }
                $body .= "<p>Por favor, acesse o sistema para realizar o envio.</p>";
                
                $mailer->send($user['email'], $subject, $body);
            }

            $count++;
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "$count reports assigned successfully"]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Delete Report
    requireAdmin();
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    try {
        // Fetch file path first
        $stmt = $pdo->prepare("SELECT file_path FROM reports WHERE id = ?");
        $stmt->execute([$id]);
        $report = $stmt->fetch();

        if ($report && $report['file_path']) {
            $fullPath = __DIR__ . '/../../uploads/' . $report['file_path'];
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }

        $stmt = $pdo->prepare("DELETE FROM reports WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Edit Report Details or Archive
    requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id = $data['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    // Handle Archive/Unarchive
    if (isset($data['action'])) {
        if ($data['action'] === 'archive') {
            $stmt = $pdo->prepare("UPDATE reports SET is_archived = 1 WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        } elseif ($data['action'] === 'unarchive') {
            $stmt = $pdo->prepare("UPDATE reports SET is_archived = 0 WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // Handle Status Update (e.g. Rejection)
    if (isset($data['status']) && $data['status'] === 'REJECTED') {
        $reason = $data['reason'] ?? 'Sem motivo especificado.';
        
        try {
            $pdo->beginTransaction();

            // Update status
            $stmt = $pdo->prepare("UPDATE reports SET status = 'REJECTED' WHERE id = ?");
            $stmt->execute([$id]);

            // Fetch user email and report details
            $stmt = $pdo->prepare("
                SELECT r.*, u.email, u.username, rt.name as report_type_name 
                FROM reports r 
                JOIN users u ON r.user_id = u.id 
                JOIN report_types rt ON r.report_type_id = rt.id
                WHERE r.id = ?
            ");
            $stmt->execute([$id]);
            $report = $stmt->fetch();

            if ($report && $report['email']) {
                require_once __DIR__ . '/../Mailer.php';
                $mailer = new Mailer();
                $subject = "Relatório Rejeitado: " . $report['report_type_name'];
                
                $body = "<p>Olá <strong>" . $report['username'] . "</strong>,</p>";
                $body .= "<p>Seu relatório '<strong>" . $report['report_type_name'] . "</strong>' (v" . $report['version'] . ") foi <span style='color: #dc2626; font-weight: bold;'>REJEITADO</span> pelo administrador.</p>";
                $body .= "<p><strong>Motivo:</strong> " . nl2br(htmlspecialchars($reason)) . "</p>";
                $body .= "<p>Por favor, verifique as correções necessárias e envie uma nova versão.</p>";
                
                $mailer->send($report['email'], $subject, $body);
            }

            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
    }

    $dueDate = $data['due_date'] ?? null;
    $description = $data['description'] ?? '';
    $recurrenceDays = isset($data['recurrence_days']) && $data['recurrence_days'] !== '' ? (int)$data['recurrence_days'] : null;

    try {
        $stmt = $pdo->prepare("UPDATE reports SET due_date = ?, description = ?, recurrence_days = ? WHERE id = ?");
        $stmt->execute([$dueDate, $description, $recurrenceDays, $id]);
         echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
