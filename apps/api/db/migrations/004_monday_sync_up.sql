-- 004_monday_sync_up.sql
-- Adds Monday.com sync support: columns on work_reqs, sync queue table, sequence table.
-- Run once per existing database. Reverse with 004_monday_sync_down.sql.

-- Step 1: Add Monday sync columns to work_reqs
ALTER TABLE work_reqs ADD COLUMN monday_item_id VARCHAR(32) NULL;
ALTER TABLE work_reqs ADD COLUMN monday_synced_at TIMESTAMP NULL;

-- Step 2: Create sync queue table (retry buffer for failed Monday API calls)
CREATE TABLE monday_sync_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_req_id INT NULL,
  operation ENUM('create', 'update', 'delete') NOT NULL,
  payload JSON NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sync_queue_workreq
    FOREIGN KEY (work_req_id) REFERENCES work_reqs(id)
    ON DELETE SET NULL
);

-- Step 3: Create sequence table for WR-YYYY-NNNN reference numbers
-- DO NOT pre-seed. The atomic upsert in reqSequenceService relies on the
-- fresh-INSERT branch firing for the first call of each year, which leaves
-- LAST_INSERT_ID at 0 and the service code returns seq=1. A pre-seed row
-- would force ON DUPLICATE KEY UPDATE on the first call, skipping 0001.
CREATE TABLE work_req_sequences (
  year INT PRIMARY KEY,
  next_seq INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Step 4: Indexes
CREATE INDEX idx_workreqs_monday_item_id ON work_reqs (monday_item_id);
CREATE INDEX idx_sync_queue_next_attempt ON monday_sync_queue (next_attempt_at, attempts);
CREATE INDEX idx_sync_queue_work_req ON monday_sync_queue (work_req_id);
