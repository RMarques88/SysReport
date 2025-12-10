-- Database Schema for Report Management System

CREATE DATABASE IF NOT EXISTS report_system;
USE report_system;

-- Sectors Table (Added in V5)
CREATE TABLE IF NOT EXISTS sectors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Sector
INSERT IGNORE INTO sectors (name, description) VALUES ('Geral', 'Setor Padrão');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hash
    role ENUM('admin', 'user', 'superadmin') DEFAULT 'user',
    email VARCHAR(255) DEFAULT NULL,
    sector_id INT DEFAULT NULL, -- Added in V5
    lgpd_accepted_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE SET NULL
);

-- Default Admin User (password: admin)
-- Note: In production, this should be changed immediately.
INSERT INTO users (username, password, role) VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE username=username;

-- Default SuperAdmin User (password: superadmin)
INSERT INTO users (username, password, role) VALUES ('superadmin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin')
ON DUPLICATE KEY UPDATE username=username;

-- Report Types Table
CREATE TABLE IF NOT EXISTS report_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    template_path VARCHAR(255) DEFAULT NULL, -- Path to the template file
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Report Types (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_report_types (
    user_id INT NOT NULL,
    report_type_id INT NOT NULL,
    PRIMARY KEY (user_id, report_type_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_type_id) REFERENCES report_types(id) ON DELETE CASCADE
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Owner
    report_type_id INT NOT NULL,
    group_id VARCHAR(36) NULL, -- UUID to group versions of the same logical report
    filename VARCHAR(255) NULL,
    original_filename VARCHAR(255) NULL,
    file_path VARCHAR(255) NULL,
    template_filename VARCHAR(255) NULL,
    template_path VARCHAR(255) NULL,
    version INT DEFAULT 1,
    status ENUM('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    description TEXT,
    due_date DATETIME,
    recurrence_days INT DEFAULT NULL COMMENT 'Days to add for next report',
    is_active BOOLEAN DEFAULT TRUE, -- Only the latest version is active by default
    is_archived TINYINT(1) DEFAULT 0, -- Added in V6
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_type_id) REFERENCES report_types(id) ON DELETE CASCADE
);

-- Report Shares Table
CREATE TABLE IF NOT EXISTS report_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_group_id VARCHAR(36) NOT NULL, -- Share the logical report (all versions)
    shared_with_user_id INT NOT NULL,
    shared_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_share (report_group_id, shared_with_user_id),
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Logs Table
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL, -- LOGIN, UPLOAD, SHARE, VIEW, etc.
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Default SMTP Settings (Empty)
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
('smtp_host', 'smtp.example.com'),
('smtp_port', '587'),
('smtp_user', 'user@example.com'),
('smtp_pass', 'password'),
('smtp_secure', 'tls'),
('smtp_from_email', 'noreply@example.com'),
('smtp_from_name', 'SysReport');
