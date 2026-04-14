-- Migration 006 DOWN
-- Reverses 006_schedule_workreq_index_up.sql by dropping the FK-backing index.

DROP INDEX idx_schedule_workreq ON schedule_events;
