<?php
require_once __DIR__ . '/../auth.php';
requireAdmin();

header('Content-Type: application/json');

try {
    // 1. Top Users (Most Reports Assigned)
    // We count unique group_ids to avoid counting versions as separate assignments?
    // Or just count all active reports?
    // Let's count distinct group_ids assigned to user.
    $stmt = $pdo->query("
        SELECT u.username, COUNT(DISTINCT r.group_id) as count
        FROM reports r
        JOIN users u ON r.user_id = u.id
        GROUP BY r.user_id
        ORDER BY count DESC
        LIMIT 5
    ");
    $topUsersAssigned = $stmt->fetchAll();

    // 2. Top Users (On Time Submissions)
    // We check the latest version of each group? Or every submission?
    // Let's check every submission that was successful.
    $stmt = $pdo->query("
        SELECT u.username, COUNT(*) as count
        FROM reports r
        JOIN users u ON r.user_id = u.id
        WHERE r.status IN ('SUBMITTED', 'APPROVED')
        AND r.created_at <= r.due_date
        GROUP BY r.user_id
        ORDER BY count DESC
        LIMIT 5
    ");
    $topUsersOnTime = $stmt->fetchAll();

    // 3. Top Users (Late Submissions)
    $stmt = $pdo->query("
        SELECT u.username, COUNT(*) as count
        FROM reports r
        JOIN users u ON r.user_id = u.id
        WHERE r.status IN ('SUBMITTED', 'APPROVED')
        AND r.created_at > r.due_date
        GROUP BY r.user_id
        ORDER BY count DESC
        LIMIT 5
    ");
    $topUsersLate = $stmt->fetchAll();

    // 4. Reports by Sector
    // Count distinct groups per sector
    $stmt = $pdo->query("
        SELECT s.name, COUNT(DISTINCT r.group_id) as count
        FROM reports r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN sectors s ON u.sector_id = s.id
        GROUP BY s.id
    ");
    $bySector = $stmt->fetchAll();

    // 5. Reports by Type
    $stmt = $pdo->query("
        SELECT rt.name, COUNT(DISTINCT r.group_id) as count
        FROM reports r
        JOIN report_types rt ON r.report_type_id = rt.id
        GROUP BY rt.id
    ");
    $byType = $stmt->fetchAll();

    // 6. Reports by Status (Current state of groups)
    // We need the status of the latest version of each group.
    // This is a bit complex in SQL without window functions in older MySQL.
    // But we can approximate by just counting all rows if we assume old versions are not 'active' or we filter by is_active=1?
    // The system sets is_active=1 for the latest version.
    $stmt = $pdo->query("
        SELECT status, COUNT(*) as count
        FROM reports
        WHERE is_active = 1
        GROUP BY status
    ");
    $byStatus = $stmt->fetchAll();

    echo json_encode([
        'top_assigned' => $topUsersAssigned,
        'top_ontime' => $topUsersOnTime,
        'top_late' => $topUsersLate,
        'by_sector' => $bySector,
        'by_type' => $byType,
        'by_status' => $byStatus
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
