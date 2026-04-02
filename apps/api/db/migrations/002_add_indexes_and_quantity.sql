-- 002_add_indexes_and_quantity.sql
-- One-time migration. Run once per existing database.
-- If a column already exists, the ALTER TABLE will error — skip and continue.

-- Step 1: Add new columns to plants
ALTER TABLE plants ADD COLUMN quantity INT NOT NULL DEFAULT 1;
ALTER TABLE plants ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Step 2: Add updated_at to other tables missing it
ALTER TABLE schedule_events ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Step 3: Consolidate duplicate plant rows into quantity
-- Create temp table with aggregated data
CREATE TABLE plants_consolidated AS
SELECT
  MIN(id) AS id,
  name,
  MAX(location) AS location,
  MAX(image_url) AS image_url,
  MAX(cost_per_unit) AS cost_per_unit,
  COUNT(*) AS quantity,
  MIN(created_at) AS created_at,
  NOW() AS updated_at
FROM plants
GROUP BY LOWER(TRIM(name)), COALESCE(image_url, ''), COALESCE(cost_per_unit, -1), name;

-- Clear plants and repopulate with consolidated rows
-- No inbound FKs reference plants.id, so this is safe
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM plants;
INSERT INTO plants (id, name, location, image_url, cost_per_unit, quantity, created_at, updated_at)
SELECT id, name, location, image_url, cost_per_unit, quantity, created_at, updated_at
FROM plants_consolidated;
SET FOREIGN_KEY_CHECKS = 1;

DROP TABLE plants_consolidated;

-- Step 4: Add indexes
CREATE INDEX idx_employees_email ON employees (email);
CREATE INDEX idx_workreqs_assigned_status_updated ON work_reqs (assignedTo, status, updated_at DESC);
CREATE INDEX idx_workreqs_refnum ON work_reqs (referenceNumber);
CREATE INDEX idx_schedule_employee ON schedule_events (employee_id);
CREATE INDEX idx_schedule_start ON schedule_events (start_time);
CREATE INDEX idx_actlogs_target ON activity_logs (target_type, target_id, created_at DESC);
CREATE INDEX idx_actlogs_created ON activity_logs (created_at DESC);
CREATE INDEX idx_actlogs_actor ON activity_logs (actor_employee_id, created_at DESC);
