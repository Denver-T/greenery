const express = require("express");
const router = express.Router();

const db = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");
const { getAccessRank, normalizeAccessLevel } = require("../utils/permissions");
const { toPositiveInt } = require("../utils/validators");
const { httpError } = require("../utils/httpError");

const AUDIENCE_LEVELS = ["technician", "manager", "admin"];
const EVENT_TYPES = ["request", "custom"];

function normalizeAudienceLevel(value) {
  const normalized = normalizeAccessLevel(value, "technician");
  return AUDIENCE_LEVELS.includes(normalized) ? normalized : "technician";
}

function normalizeEventType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EVENT_TYPES.includes(normalized) ? normalized : "request";
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function validateCustomEventPayload(body, { partial = false } = {}) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const details =
    body?.details === undefined || body?.details === null ? null : String(body.details).trim().slice(0, 500);
  const startTime = normalizeDateTime(body?.start_time);
  const endTime = normalizeDateTime(body?.end_time);
  const audienceLevel = normalizeAudienceLevel(body?.audience_level);
  const employeeId = body?.employee_id === undefined || body?.employee_id === null || body?.employee_id === ""
    ? null
    : Number(body.employee_id);

  if (!partial || body?.title !== undefined) {
    if (!title || title.length > 150) {
      return { error: "Title is required and must be 150 characters or fewer." };
    }
  }

  if ((!partial || body?.start_time !== undefined) && !startTime) {
    return { error: "Start time must be a valid date/time." };
  }

  if ((!partial || body?.end_time !== undefined) && !endTime) {
    return { error: "End time must be a valid date/time." };
  }

  if (startTime && endTime && startTime > endTime) {
    return { error: "End time must be after the start time." };
  }

  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    return { error: "Employee id must be a positive integer when provided." };
  }

  return {
    data: {
      title,
      details,
      startTime,
      endTime,
      audienceLevel,
      employeeId,
    },
  };
}

async function getScheduleEventById(id) {
  const [rows] = await db.query(
    `
      SELECT
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
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

router.get(
  "/",
  verifyToken,
  authorize("technician", "manager", "admin"),
  async (req, res, next) => {
    try {
      const userRank = getAccessRank(req.user?.permissionLevel || req.user?.role || "technician");
      // Unconditional LEFT JOIN to work_reqs so calendar events that link a
      // work request carry the linked request's status + reference + sync
      // metadata. Values are NULL for custom events (no work_req_id) — the
      // calendar page treats null work_req_reference as "custom event".
      // Strictly additive: existing consumers see every field they had before.
      const [rows] = await db.query(
        `
          SELECT
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
            e.name AS employee_name,
            wr.status AS work_req_status,
            wr.referenceNumber AS work_req_reference,
            wr.monday_item_id AS work_req_monday_item_id,
            wr.monday_synced_at AS work_req_monday_synced_at
          FROM schedule_events s
          LEFT JOIN employees e ON s.employee_id = e.id
          LEFT JOIN work_reqs wr ON s.work_req_id = wr.id
          WHERE
            CASE s.audience_level
              WHEN 'admin' THEN 3
              WHEN 'manager' THEN 2
              ELSE 1
            END <= ?
          ORDER BY s.start_time ASC
        `,
        [userRank]
      );

      return res.status(200).json({ data: rows });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const validation = validateCustomEventPayload(req.body);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }

      const { title, details, startTime, endTime, audienceLevel, employeeId } = validation.data;

      const [result] = await db.query(
        `
          INSERT INTO schedule_events (
            title,
            start_time,
            end_time,
            employee_id,
            work_req_id,
            event_type,
            audience_level,
            details,
            created_by_email
          )
          VALUES (?, ?, ?, ?, NULL, 'custom', ?, ?, ?)
        `,
        [title, startTime, endTime, employeeId, audienceLevel, details, req.user?.email || null]
      );

      const created = await getScheduleEventById(result.insertId);
      return res.status(201).json({ data: created });
    } catch (err) {
      return next(err);
    }
  }
);

router.put(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const eventId = toPositiveInt(req.params.id);
      if (eventId === null) {
        return next(
          httpError(400, "Schedule event id must be a positive integer", "VALIDATION_ERROR")
        );
      }

      const existing = await getScheduleEventById(eventId);
      if (!existing) {
        return res.status(404).json({ error: "Schedule event not found." });
      }

      if (normalizeEventType(existing.event_type) !== "custom") {
        return res.status(403).json({ error: "Only custom events can be edited here." });
      }

      const validation = validateCustomEventPayload(req.body, { partial: false });
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }

      const { title, details, startTime, endTime, audienceLevel, employeeId } = validation.data;

      await db.query(
        `
          UPDATE schedule_events
          SET
            title = ?,
            details = ?,
            start_time = ?,
            end_time = ?,
            employee_id = ?,
            audience_level = ?,
            created_by_email = ?
          WHERE id = ?
        `,
        [title, details, startTime, endTime, employeeId, audienceLevel, req.user?.email || null, eventId]
      );

      const updated = await getScheduleEventById(eventId);
      return res.status(200).json({ data: updated });
    } catch (err) {
      return next(err);
    }
  }
);

router.delete(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const eventId = toPositiveInt(req.params.id);
      if (eventId === null) {
        return next(
          httpError(400, "Schedule event id must be a positive integer", "VALIDATION_ERROR")
        );
      }

      const existing = await getScheduleEventById(eventId);
      if (!existing) {
        return res.status(404).json({ error: "Schedule event not found." });
      }

      if (normalizeEventType(existing.event_type) !== "custom") {
        return res.status(403).json({ error: "Only custom events can be deleted here." });
      }

      await db.query(`DELETE FROM schedule_events WHERE id = ?`, [eventId]);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
