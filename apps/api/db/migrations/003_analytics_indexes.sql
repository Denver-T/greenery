-- 003_analytics_indexes.sql
-- One-time migration. Run once per existing database.
-- MySQL 8 does not support CREATE INDEX IF NOT EXISTS.
-- If an index already exists, the statement will error — skip and continue.

CREATE INDEX idx_workreqs_status_created ON work_reqs (status, created_at);
CREATE INDEX idx_workreqs_plantwanted ON work_reqs (plantWanted);
CREATE INDEX idx_workreqs_plantreplaced ON work_reqs (plantReplaced);
CREATE INDEX idx_workreqs_account_status ON work_reqs (account, status);
