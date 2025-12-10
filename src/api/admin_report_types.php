<?php
require_once __DIR__ . '/../auth.php';
requireAdmin(); // Admin only

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all types
    $stmt = $pdo->query("SELECT * FROM report_types ORDER BY name");
    echo json_encode($stmt->fetchAll());


} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Add new type or Update existing (via _method=PUT or just standard POST with ID?)
    // Using standard REST practices, but PHP forms often need POST. Let's check for ID.
    
    $id = $_POST['id'] ?? null;
    $name = $_POST['name'] ?? '';
    $description = $_POST['description'] ?? '';
    $templatePath = null;

    if (!$name) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name is required']);
        exit;
    }

    // Handle File Upload
    if (isset($_FILES['template']) && $_FILES['template']['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($_FILES['template']['name'], PATHINFO_EXTENSION));
        if ($ext !== 'xlsx' && $ext !== 'xls') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid template format']);
            exit;
        }
        $uploadDir = __DIR__ . '/../../uploads/templates/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $filename = time() . '_template_' . basename($_FILES['template']['name']);
        move_uploaded_file($_FILES['template']['tmp_name'], $uploadDir . $filename);
        $templatePath = 'templates/' . $filename;
    }

    try {
        if ($id) {
            // Update
            $sql = "UPDATE report_types SET name = ?, description = ?";
            $params = [$name, $description];
            
            if ($templatePath) {
                $sql .= ", template_path = ?";
                $params[] = $templatePath;
            }
            
            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => 'Report type updated']);
        } else {
            // Create
            $stmt = $pdo->prepare("INSERT INTO report_types (name, description, template_path) VALUES (?, ?, ?)");
            $stmt->execute([$name, $description, $templatePath]);
            echo json_encode(['success' => true, 'message' => 'Report type created']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM report_types WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
