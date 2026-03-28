-- apps/api/db/init/01_schema.sql

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS schedule_events;
DROP TABLE IF EXISTS work_reqs;
DROP TABLE IF EXISTS plants;
DROP TABLE IF EXISTS employees;

SET FOREIGN_KEY_CHECKS = 1;

-- Employees
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('Technician', 'Manager', 'Administrator') NOT NULL DEFAULT 'Technician',
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  permissionLevel ENUM('Technician', 'Manager', 'Administrator', 'SuperAdmin') NOT NULL DEFAULT 'Technician',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Plants
CREATE TABLE plants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work_reqs
CREATE TABLE IF NOT EXISTS work_reqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referenceNumber VARCHAR(50) NOT NULL,
  requestDate DATE NOT NULL,

  techName VARCHAR(100) NULL,
  account VARCHAR(150) NOT NULL,
  accountContact VARCHAR(150) NULL,
  accountAddress VARCHAR(255) NULL,

  actionRequired VARCHAR(255) NOT NULL,
  numberOfPlants INT NULL,

  plantWanted VARCHAR(150) NULL,
  plantReplaced VARCHAR(150) NULL,
  plantSize VARCHAR(50) NULL,
  plantHeight VARCHAR(50) NULL,

  planterTypeSize VARCHAR(150) NULL,
  planterColour VARCHAR(100) NULL,
  stagingMaterial VARCHAR(255) NULL,

  lighting VARCHAR(50) NULL,
  method VARCHAR(255) NULL,
  location VARCHAR(150) NULL,
  notes TEXT NULL,

  picturePath VARCHAR(255) NULL,

  assignedTo INT NULL,
  dueDate DATE NULL,
  status ENUM('unassigned', 'assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'unassigned',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_workreq_employee
    FOREIGN KEY (assignedTo) REFERENCES employees(id)
    ON DELETE SET NULL
);

-- Schedule / Calendar
CREATE TABLE schedule_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  employee_id INT NULL,
  work_req_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sched_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_sched_workreq
    FOREIGN KEY (work_req_id) REFERENCES work_reqs(id)
    ON DELETE SET NULL
);

-- Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL
);

-- Activity logs
CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_employee_id INT NULL,
  actor_email VARCHAR(255) NULL,
  actor_permission_level VARCHAR(50) NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id INT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_employee
    FOREIGN KEY (actor_employee_id) REFERENCES employees(id)
    ON DELETE SET NULL
);
