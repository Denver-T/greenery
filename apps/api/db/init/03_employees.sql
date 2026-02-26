CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('Technician','Manager','Administrator') NOT NULL DEFAULT 'Technician',
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  permissionLevel ENUM('Technician','Manager','Administrator') NOT NULL DEFAULT 'Technician',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);