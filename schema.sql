-- ServicePilot fresh-install schema; run ONCE in MySQL Workbench.
-- All sample records and people in seed.sql are FICTIONAL.
CREATE DATABASE IF NOT EXISTS servicepilot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE servicepilot;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role ENUM('admin','technician') NOT NULL DEFAULT 'technician',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_expiry (expires_at)
);

CREATE TABLE assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_tag VARCHAR(40) NOT NULL UNIQUE,
  device_name VARCHAR(120) NOT NULL,
  asset_type ENUM('Laptop','Desktop','Monitor','Printer','Phone','Other') NOT NULL,
  serial_number VARCHAR(100) NULL,
  assigned_to VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
  location VARCHAR(120) NOT NULL DEFAULT 'Main office',
  status ENUM('Active','Maintenance','Retired') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assets_status (status)
);

CREATE TABLE tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  requester VARCHAR(100) NOT NULL,
  requester_email VARCHAR(160) NULL,
  category ENUM('Hardware','Software','Network','Access','Other') NOT NULL DEFAULT 'Other',
  priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  description TEXT NOT NULL,
  assignee_id INT UNSIGNED NULL,
  asset_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_priority (priority),
  INDEX idx_tickets_created (created_at)
);

CREATE TABLE ticket_activity (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  action ENUM('created','status','assigned','priority','asset','note') NOT NULL,
  description VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ticket_activity (ticket_id, created_at)
);
