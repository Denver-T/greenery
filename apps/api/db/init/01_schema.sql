-- apps/api/db/init/01_schema.sql
-- Enhanced schema with constraints, regex validation, and input checks.

-- ============================================
-- ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL
    CHECK (CHAR_LENGTH(name) >= 2),

  role ENUM('technician','manager','admin') NOT NULL,

  email VARCHAR(255) NULL UNIQUE
    CHECK (
      email IS NULL OR
      email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),

  phone VARCHAR(12) NULL
    CHECK (
      phone IS NULL OR
      phone REGEXP '^[0-9-]{0,12}$'
    ),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PLANTS
-- ============================================

CREATE TABLE IF NOT EXISTS plants (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL
    CHECK (CHAR_LENGTH(name) >= 2),

  location VARCHAR(150) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,

  title VARCHAR(150) NOT NULL
    CHECK (CHAR_LENGTH(title) >= 3),

  status ENUM('assigned','in_progress','completed','cancelled')
    NOT NULL DEFAULT 'assigned',

  assigned_to INT NULL,

  plant_id INT NULL,

  notes TEXT NULL,

  due_date DATETIME NULL
    CHECK (due_date IS NULL OR due_date >= '2000-01-01'),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_tasks_assigned_to
    FOREIGN KEY (assigned_to)
    REFERENCES accounts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_tasks_plant
    FOREIGN KEY (plant_id)
    REFERENCES plants(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- ============================================
-- SCHEDULE EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS schedule_events (
  id INT AUTO_INCREMENT PRIMARY KEY,

  title VARCHAR(150) NOT NULL
    CHECK (CHAR_LENGTH(title) >= 3),

  start_time DATETIME NOT NULL,

  end_time DATETIME NOT NULL,

  account_id INT NULL,

  task_id INT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_schedule_time
    CHECK (end_time >= start_time),

  CONSTRAINT fk_sched_account
    FOREIGN KEY (account_id)
    REFERENCES accounts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_sched_task
    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(150) NOT NULL
    CHECK (CHAR_LENGTH(name) >= 2),

  description TEXT NULL,

  price DECIMAL(10,2) NOT NULL DEFAULT 0.00
    CHECK (price >= 0),

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,

  account_id INT NULL,

  status ENUM('pending','received','completed','cancelled')
    NOT NULL DEFAULT 'pending',

  notes TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_account
    FOREIGN KEY (account_id)
    REFERENCES accounts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  order_id INT NOT NULL,

  product_id INT NOT NULL,

  quantity INT NOT NULL DEFAULT 1
    CHECK (quantity > 0 AND quantity <= 10000),

  price_each DECIMAL(10,2) NOT NULL DEFAULT 0.00
    CHECK (price_each >= 0),

  CONSTRAINT fk_item_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_item_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,

  account_id INT NULL,

  message VARCHAR(255) NOT NULL
    CHECK (CHAR_LENGTH(message) >= 1),

  is_read BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_account
    FOREIGN KEY (account_id)
    REFERENCES accounts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- ============================================
-- INDEXES (performance)
-- ============================================

CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_plant_id ON tasks(plant_id);
CREATE INDEX idx_orders_account ON orders(account_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_notifications_account ON notifications(account_id);