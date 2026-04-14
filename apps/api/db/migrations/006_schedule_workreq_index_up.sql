-- Migration 006 UP
-- Adds an index on schedule_events.work_req_id for the work_req <-> schedule_events
-- coupling feature. The new UI paths query
--   WHERE work_req_id = ?           (list linked events on a work request)
--   LEFT JOIN ... ON work_req_id    (unscheduled inbox, calendar sync badges)
-- Both benefit significantly from this index as soon as linked events become
-- common. 01_schema.sql adds the same index for fresh installs; this migration
-- exists to backfill databases provisioned from an earlier schema version.
--
-- Safe to run on a populated table — creating a non-unique secondary index in
-- InnoDB is online and blocking only at metadata lock level.

CREATE INDEX idx_schedule_workreq ON schedule_events (work_req_id);
