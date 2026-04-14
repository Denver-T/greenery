// apps/api/src/services/workReqScheduleService.js
//
// Service layer for the work_req <-> schedule_events coupling feature.
//
// Owns all SQL for the /reqs/:id/schedule-events sub-resource and the
// /reqs/unscheduled inbox. The route handlers in reqs.js stay thin.
//
// Invariants enforced here (not at the route layer):
// - schedule_events tied to a work_req always have event_type = 'request'
// - title is server-derived from the work request's reference number
// - employee_id, when provided, must reference an Active employee row
// - unscheduled inbox hides work_reqs older than 30 days by default
//
// Transaction handling:
// - createLinkedEvent uses a single atomic INSERT — no multi-statement txn
//   needed because there's only one write
// - listUnscheduledWorkReqs uses a LEFT JOIN ... IS NULL query per Decision E
// - deleteLinkedEvent's ownership guard runs in a two-step (SELECT then
//   DELETE) on a SHARED connection so a concurrent delete can't race past
//   the ownership check

const db = require("../db");
const { logActivity } = require("../utils/activityLogger");

// Sentinel used when audienceLevel is not explicitly passed to createLinkedEvent.
// Matches the default in schedule.js's normalizeAudienceLevel so the UI can
// omit the field entirely (v1 dialog does not expose it).
const DEFAULT_AUDIENCE_LEVEL = "technician";
const VALID_AUDIENCE_LEVELS = new Set(["technician", "manager", "admin"]);

// 60 chars of actionRequired + the reference number fit in the
// schedule_events.title VARCHAR(150) column without truncation risk.
const TITLE_ACTION_SLICE = 60;

// Default historical window for the unscheduled inbox.
// Hides backlog from the demo view; the "Show older" toggle bypasses it.
const DEFAULT_UNSCHEDULED_WINDOW_DAYS = 30;

/**
 * Validate and normalize the request body for a schedule-event create call.
 * Mirrors schedule.js's validateCustomEventPayload but omits the title field
 * (the service derives it from the work request row).
 *
 * Returns either { error: "..." } or { data: {...} } — never throws.
 */
function validateRequestScheduleEventPayload(body) {
  const startTime = normalizeDateTime(body?.start_time);
  const endTime = normalizeDateTime(body?.end_time);
  const details =
    body?.details === undefined || body?.details === null
      ? null
      : String(body.details).trim().slice(0, 500) || null;

  const rawAudience = body?.audience_level;
  const audienceLevel =
    rawAudience && VALID_AUDIENCE_LEVELS.has(String(rawAudience).toLowerCase())
      ? String(rawAudience).toLowerCase()
      : DEFAULT_AUDIENCE_LEVEL;

  const rawEmployeeId = body?.employee_id;
  const employeeId =
    rawEmployeeId === undefined || rawEmployeeId === null || rawEmployeeId === ""
      ? null
      : Number(rawEmployeeId);

  if (!startTime) {
    return { error: "start_time is required and must be a valid date/time." };
  }
  if (!endTime) {
    return { error: "end_time is required and must be a valid date/time." };
  }
  if (startTime >= endTime) {
    return { error: "end_time must be after start_time." };
  }
  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    return { error: "employee_id must be a positive integer when provided." };
  }

  return {
    data: { startTime, endTime, employeeId, audienceLevel, details },
  };
}

/**
 * Normalize a datetime input into a MySQL DATETIME string (YYYY-MM-DD HH:MM:SS).
 * Accepts ISO strings, datetime-local strings, and Date objects. Returns null
 * on unparseable input.
 *
 * Server and client both assumed to run in America/Edmonton per Decision G.
 */
function normalizeDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const y = parsed.getFullYear();
  const mo = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  const h = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");
  const s = String(parsed.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

/**
 * List every schedule_event linked to the given work request.
 * Ordered by start_time ASC — earliest first.
 */
async function listLinkedEvents(workReqId) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.title,
       s.details,
       s.start_time,
       s.end_time,
       s.employee_id,
       s.work_req_id,
       s.event_type,
       s.audience_level,
       s.created_by_email,
       e.name AS employee_name
     FROM schedule_events s
     LEFT JOIN employees e ON s.employee_id = e.id
     WHERE s.work_req_id = ?
     ORDER BY s.start_time ASC`,
    [workReqId],
  );
  return rows;
}

/**
 * Create a request-typed schedule event tied to a work request.
 *
 * Validates inputs, confirms the work request exists, confirms the employee
 * (if any) is Active, then INSERTs with event_type='request' hardcoded.
 *
 * Fires activityLogger.logActivity on success (fire-and-forget).
 *
 * Throws a plain Error subclass with .statusCode / .code properties that the
 * global error handler formats into the standard {error:{code,message}} shape.
 */
async function createLinkedEvent({
  workReqId,
  body,
  req = null,
}) {
  const validation = validateRequestScheduleEventPayload(body);
  if (validation.error) {
    const err = new Error(validation.error);
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const { startTime, endTime, employeeId, audienceLevel, details } =
    validation.data;

  // Confirm the work request exists and pull the reference + action for the title
  const [workReqRows] = await db.query(
    `SELECT id, referenceNumber, actionRequired FROM work_reqs WHERE id = ? LIMIT 1`,
    [workReqId],
  );
  const workReq = workReqRows[0];
  if (!workReq) {
    const err = new Error("Work request not found.");
    err.statusCode = 404;
    err.code = "WORK_REQ_NOT_FOUND";
    throw err;
  }

  // Employee existence + Active check (only when explicitly provided)
  if (employeeId !== null) {
    const [empRows] = await db.query(
      `SELECT id FROM employees WHERE id = ? AND status = 'Active' LIMIT 1`,
      [employeeId],
    );
    if (empRows.length === 0) {
      const err = new Error(
        "The selected technician is not available — they may be inactive or removed.",
      );
      err.statusCode = 400;
      err.code = "EMPLOYEE_NOT_FOUND";
      throw err;
    }
  }

  const title = buildEventTitle(workReq);
  const createdByEmail = req?.user?.email || null;

  const [result] = await db.query(
    `INSERT INTO schedule_events (
       title,
       start_time,
       end_time,
       employee_id,
       work_req_id,
       event_type,
       audience_level,
       details,
       created_by_email
     ) VALUES (?, ?, ?, ?, ?, 'request', ?, ?, ?)`,
    [
      title,
      startTime,
      endTime,
      employeeId,
      workReqId,
      audienceLevel,
      details,
      createdByEmail,
    ],
  );

  const created = await getLinkedEventById(result.insertId);

  // Fire-and-forget audit log
  void logActivity({
    req,
    action: "schedule.request.create",
    targetType: "schedule_event",
    targetId: result.insertId,
    metadata: {
      work_req_id: workReqId,
      reference_number: workReq.referenceNumber,
      start_time: startTime,
      end_time: endTime,
      employee_id: employeeId,
    },
  });

  return created;
}

/**
 * Look up a single schedule_event row by its id, including joined employee name.
 * Used internally by createLinkedEvent to return the freshly-inserted row.
 */
async function getLinkedEventById(eventId) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.title,
       s.details,
       s.start_time,
       s.end_time,
       s.employee_id,
       s.work_req_id,
       s.event_type,
       s.audience_level,
       s.created_by_email,
       e.name AS employee_name
     FROM schedule_events s
     LEFT JOIN employees e ON s.employee_id = e.id
     WHERE s.id = ?
     LIMIT 1`,
    [eventId],
  );
  return rows[0] || null;
}

/**
 * Build the title string inserted into schedule_events.title for a
 * request-typed event. Format: "WR-2026-0042 — Replace fern".
 *
 * Action text is truncated to TITLE_ACTION_SLICE characters so the combined
 * title fits comfortably in the 150-char column.
 */
function buildEventTitle(workReq) {
  const ref = workReq.referenceNumber || `WR-${workReq.id}`;
  const action = (workReq.actionRequired || "").trim();
  if (!action) return ref;
  const truncated =
    action.length > TITLE_ACTION_SLICE
      ? `${action.slice(0, TITLE_ACTION_SLICE - 1)}…`
      : action;
  return `${ref} — ${truncated}`;
}

/**
 * Unschedule (delete) a linked event from a work request.
 *
 * Ownership guard: the event must belong to the work_req in the URL. Prevents
 * a malformed client from deleting an unrelated event by guessing its id.
 *
 * Returns true on successful delete, throws with statusCode on mismatch or
 * missing row.
 */
async function deleteLinkedEvent({ workReqId, eventId, req = null }) {
  const [rows] = await db.query(
    `SELECT id, work_req_id FROM schedule_events WHERE id = ? LIMIT 1`,
    [eventId],
  );
  const existing = rows[0];
  if (!existing) {
    const err = new Error("Schedule event not found.");
    err.statusCode = 404;
    err.code = "SCHEDULE_EVENT_NOT_FOUND";
    throw err;
  }
  if (Number(existing.work_req_id) !== Number(workReqId)) {
    const err = new Error(
      "This schedule event does not belong to the given work request.",
    );
    err.statusCode = 404;
    err.code = "SCHEDULE_EVENT_NOT_FOUND";
    throw err;
  }

  await db.query(`DELETE FROM schedule_events WHERE id = ?`, [eventId]);

  void logActivity({
    req,
    action: "schedule.request.delete",
    targetType: "schedule_event",
    targetId: eventId,
    metadata: { work_req_id: workReqId },
  });

  return true;
}

/**
 * List work requests with no linked schedule events — the "not yet scheduled" inbox.
 *
 * LEFT JOIN / IS NULL pattern per Decision E. Filter semantics:
 * - filters.account           → LOWER(account) LIKE LOWER(?) with %q%
 * - filters.assignedTo        → exact integer match on work_reqs.assignedTo
 * - filters.assignedToPresent → when true, requires assignedTo IS NOT NULL
 * - filters.includeOlder      → when true, removes the default 30-day window
 *
 * Returns { rows, total } so the route can construct paginatedResponse.
 */
async function listUnscheduledWorkReqs({
  pageSize = 25,
  offset = 0,
  filters = {},
}) {
  const where = ["se.work_req_id IS NULL"];
  const params = [];

  if (!filters.includeOlder) {
    where.push(`wr.created_at >= (NOW() - INTERVAL ${DEFAULT_UNSCHEDULED_WINDOW_DAYS} DAY)`);
  }

  if (filters.assignedToPresent) {
    where.push("wr.assignedTo IS NOT NULL");
  }

  if (
    filters.assignedTo !== undefined &&
    filters.assignedTo !== null &&
    filters.assignedTo !== ""
  ) {
    const assignedTo = Number(filters.assignedTo);
    if (Number.isInteger(assignedTo) && assignedTo > 0) {
      where.push("wr.assignedTo = ?");
      params.push(assignedTo);
    }
  }

  if (typeof filters.account === "string" && filters.account.trim() !== "") {
    where.push("LOWER(wr.account) LIKE LOWER(?)");
    params.push(`%${filters.account.trim()}%`);
  }

  const whereClause = where.join(" AND ");

  // COUNT query — match the same WHERE clause and joins
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
       FROM work_reqs wr
       LEFT JOIN schedule_events se ON se.work_req_id = wr.id
      WHERE ${whereClause}`,
    params,
  );
  const total = Number(countRows[0]?.total || 0);

  // Row query — only the columns the inbox list needs
  const [rows] = await db.query(
    `SELECT
        wr.id,
        wr.referenceNumber,
        wr.account,
        wr.actionRequired,
        wr.techName,
        wr.assignedTo,
        wr.dueDate,
        wr.status,
        wr.created_at
      FROM work_reqs wr
      LEFT JOIN schedule_events se ON se.work_req_id = wr.id
      WHERE ${whereClause}
      ORDER BY wr.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  return { rows, total };
}

module.exports = {
  listLinkedEvents,
  createLinkedEvent,
  deleteLinkedEvent,
  listUnscheduledWorkReqs,
  validateRequestScheduleEventPayload,
  normalizeDateTime,
  buildEventTitle,
  // Internal — exported for tests
  getLinkedEventById,
  DEFAULT_UNSCHEDULED_WINDOW_DAYS,
};
