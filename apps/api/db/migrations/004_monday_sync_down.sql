-- 004_monday_sync_down.sql
-- Reverses 004_monday_sync_up.sql. Safe to run if the up migration has been applied.

-- Step 1: Drop indexes on work_reqs
DROP INDEX idx_workreqs_monday_item_id ON work_reqs;

-- Step 2: Drop Monday sync columns from work_reqs
ALTER TABLE work_reqs DROP COLUMN monday_item_id;
ALTER TABLE work_reqs DROP COLUMN monday_synced_at;

-- Step 3: Drop sync queue table (indexes dropped automatically with the table)
DROP TABLE IF EXISTS monday_sync_queue;

-- Step 4: Drop sequence table
DROP TABLE IF EXISTS work_req_sequences;
