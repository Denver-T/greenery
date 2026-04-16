// apps/api/src/routes/reqs.js
// Work request router backed directly by the `work_reqs` table.
// This route family is the main schema-owned path for operational request data.

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");

const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");
const { parsePagination, paginatedResponse } = require("../utils/pagination");
const { nextReferenceNumber } = require("../services/reqSequenceService");
const mondaySyncService = require("../services/mondaySyncService");
const workReqScheduleService = require("../services/workReqScheduleService");
const {
  VALID_STATUSES: TASK_VALID_STATUSES,
} = require("../services/taskService");
const { httpError } = require("../utils/httpError");
const { logActivity } = require("../utils/activityLogger");
const env = require("../lib/env");

// PUT /reqs/:id accepts the same status values as the dedicated tasks
// endpoint. Reused from taskService so there's one source of truth — adding
// a new status only requires editing the canonical list. 'unassigned' is
// filtered out explicitly here: PUT cannot un-assign a request, the assign
// endpoint owns that transition because it also clears the assignedTo FK.
// The explicit filter is load-bearing — if taskService later adds
// 'unassigned' to its enum, this boundary still enforces the one-way door.
const VALID_WORK_REQ_STATUSES = new Set(
  TASK_VALID_STATUSES.filter((s) => s !== "unassigned"),
);

const router = express.Router();

// Ensure upload directory exists before multer attempts to write files.
// Configurable via UPLOAD_DIR — defaults to apps/api/uploads locally,
// set to /home/uploads on Azure App Service for persistence across restarts.
const uploadDir = env.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

// Configure multer disk storage.
// Filenames are randomized to avoid collisions and to avoid trusting client filenames.
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeBase = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `req-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter(req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const err = new Error(
        "Invalid file type. Only JPEG, PNG, and WEBP images are allowed.",
      );
      err.statusCode = 400;
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }

    return cb(null, true);
  },
});

function parseOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parsePositiveInt(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeString(value, maxLength = null) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  if (maxLength && trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }

  return trimmed;
}

// Date columns (DATE type in MySQL) come back from mysql2 as JS Date objects
// constructed via `new Date(y, m-1, d)` — i.e., local midnight. Passing a
// Date through String() produces the native toString format
// ("Tue Apr 14 2026 00:00:00 GMT-0600 (…)") which MySQL rejects with
// "Incorrect date value" on write. This helper converts to YYYY-MM-DD for
// both paths the route receives:
//
//   1. String from the client (<input type="date">): ECMAScript parses
//      bare ISO date strings like "2026-04-14" as UTC midnight. Reading
//      them back with local getters in a non-UTC timezone silently shifts
//      the day — in America/Edmonton that would save "2026-04-13" for
//      every request created on Apr 14. So YYYY-MM-DD strings are passed
//      through verbatim.
//   2. Date object from mysql2: read with local getters, which match how
//      mysql2 constructs the Date (local midnight from the server's DATE
//      value).
//
// Anything else (ISO datetime with time + zone, Date with non-zero time)
// is coerced via the Date constructor and read with local getters, which
// matches the caller's local day of that instant. Invalid input returns
// null so the caller can decide how to fall back.
const YYYY_MM_DD_RE = /^\d{4}-\d{2}-\d{2}$/;
function toDateOnlyString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (YYYY_MM_DD_RE.test(trimmed)) {
      // Validate the date is actually real (e.g. rejects "2026-02-30").
      const [y, m, d] = trimmed.split("-").map(Number);
      const probe = new Date(y, m - 1, d);
      if (
        probe.getFullYear() !== y ||
        probe.getMonth() !== m - 1 ||
        probe.getDate() !== d
      ) {
        return null;
      }
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

function handleUpload(req, res, next) {
  // Centralize upload error normalization so route handlers can stay focused on schema validation.
  upload.single("picture")(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        err.statusCode = 400;
        err.code = "FILE_TOO_LARGE";
        err.message = "Image must be 5 MB or smaller.";
      } else {
        err.statusCode = 400;
        err.code = "UPLOAD_ERROR";
      }
    }

    return next(err);
  });
}

function getTodayDateOnlyString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getAuthenticatedEmployeeName(req) {
  const email =
    typeof req.user?.email === "string"
      ? req.user.email.trim().toLowerCase()
      : null;

  if (!email) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT name FROM employees WHERE email = ? LIMIT 1`,
    [email],
  );

  return rows[0]?.name || null;
}

function buildReqPayload(body = {}, file = null, existing = null) {
  const referenceNumber = normalizeString(
    body.referenceNumber ?? existing?.referenceNumber,
    100,
  );
  // requestDate and dueDate get date-specific coercion so existing Date
  // objects read from mysql2 round-trip correctly when the client submits a
  // partial payload (e.g. Mark Complete sends only {status, autoClose}).
  // existing.* values come from the DB and are trusted — they only need
  // coercion, not re-validation. body.* values are re-validated below.
  const requestDate = toDateOnlyString(
    body.requestDate ?? existing?.requestDate,
  );
  const techName = normalizeString(body.techName ?? existing?.techName, 120);
  const account = normalizeString(body.account ?? existing?.account, 150);
  const actionRequired = normalizeString(
    body.actionRequired ?? existing?.actionRequired,
    255,
  );

  if (!referenceNumber || !requestDate || !account || !actionRequired) {
    return {
      error:
        "referenceNumber, requestDate, account, and actionRequired are required",
    };
  }

  // toDateOnlyString is strict — it rejects garbage strings ("bad-date") and
  // impossible days ("2026-02-30") by returning null, which the required
  // check above catches. The separate isValidDateString branches that used
  // to live here were unreachable after the cycle-3 helper rewrite and have
  // been removed. HTML `<input type="date">` never emits bad values in
  // practice; if a direct-API caller sends garbage they get the "required"
  // error, which is acceptable for v1.
  const dueDate = toDateOnlyString(body.dueDate ?? existing?.dueDate);

  const rawNumberOfPlants =
    body.numberOfPlants !== undefined
      ? body.numberOfPlants
      : existing?.numberOfPlants;
  const numberOfPlants = parseOptionalPositiveInt(rawNumberOfPlants);
  if (
    rawNumberOfPlants !== undefined &&
    rawNumberOfPlants !== null &&
    rawNumberOfPlants !== "" &&
    numberOfPlants === null
  ) {
    return { error: "numberOfPlants must be a valid non-negative integer" };
  }

  // Status: only validated when the client explicitly provides it. Absent or
  // null means "keep existing". The edit form does not send status; the
  // Mark Complete action on the detail page does.
  let status = existing?.status || "unassigned";
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    if (typeof body.status !== "string") {
      return { error: "status must be a string" };
    }
    const normalized = body.status.trim().toLowerCase();
    if (!VALID_WORK_REQ_STATUSES.has(normalized)) {
      return {
        error: `status must be one of: ${Array.from(VALID_WORK_REQ_STATUSES).join(", ")}`,
      };
    }
    status = normalized;
  }

  return {
    referenceNumber,
    requestDate,
    techName,
    account,
    actionRequired,
    accountContact: normalizeString(
      body.accountContact ?? existing?.accountContact,
      150,
    ),
    accountAddress: normalizeString(
      body.accountAddress ?? existing?.accountAddress,
      255,
    ),
    numberOfPlants,
    plantWanted: normalizeString(
      body.plantWanted ?? existing?.plantWanted,
      150,
    ),
    plantReplaced: normalizeString(
      body.plantReplaced ?? existing?.plantReplaced,
      150,
    ),
    plantSize: normalizeString(body.plantSize ?? existing?.plantSize, 100),
    plantHeight: normalizeString(
      body.plantHeight ?? existing?.plantHeight,
      100,
    ),
    planterTypeSize: normalizeString(
      body.planterTypeSize ?? existing?.planterTypeSize,
      100,
    ),
    planterColour: normalizeString(
      body.planterColour ?? existing?.planterColour,
      100,
    ),
    stagingMaterial: normalizeString(
      body.stagingMaterial ?? existing?.stagingMaterial,
      150,
    ),
    lighting: normalizeString(body.lighting ?? existing?.lighting, 100),
    method: normalizeString(body.method ?? existing?.method, 100),
    location: normalizeString(body.location ?? existing?.location, 150),
    notes: normalizeString(body.notes ?? existing?.notes, 2000),
    picturePath: file
      ? `/uploads/${file.filename}`
      : (existing?.picturePath ?? null),
    assignedTo: existing?.assignedTo ?? null,
    dueDate,
    status,
  };
}

// Column list for getReqById — prefixed with `wr.` so the LEFT JOIN
// to employees doesn't collide with employees.id / employees.status.
const REQ_COLUMNS_QUALIFIED = `wr.id, wr.referenceNumber, wr.requestDate, wr.techName,
  wr.account, wr.accountContact, wr.accountAddress, wr.actionRequired, wr.numberOfPlants,
  wr.plantWanted, wr.plantReplaced, wr.plantSize, wr.plantHeight, wr.planterTypeSize,
  wr.planterColour, wr.stagingMaterial, wr.lighting, wr.method, wr.location, wr.notes,
  wr.picturePath, wr.assignedTo, wr.dueDate, wr.status, wr.monday_item_id,
  wr.monday_synced_at, wr.created_at, wr.updated_at`;

async function getReqById(id) {
  const [rows] = await db.query(
    `SELECT ${REQ_COLUMNS_QUALIFIED}, e.name AS assignedToName
       FROM work_reqs wr
       LEFT JOIN employees e ON e.id = wr.assignedTo
      WHERE wr.id = ?
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/**
 * POST /reqs
 * Creates a new work request.
 *
 * Schema notes:
 * - `referenceNumber`, `requestDate`, `account`, and `actionRequired` are required by `work_reqs`
 * - uploaded images are persisted separately and only the relative path is stored in MySQL
 */
router.post(
  "/",
  writeLimiter,
  verifyToken,
  authorize("technician", "manager", "admin"),
  handleUpload,
  async (req, res, next) => {
    try {
      const authenticatedTechName = await getAuthenticatedEmployeeName(req);

      // Server-generated reference number (WR-YYYY-NNNN)
      const refNumber = await nextReferenceNumber();

      const payload = buildReqPayload(
        {
          ...req.body,
          referenceNumber: refNumber,
          techName: authenticatedTechName || req.body?.techName,
          requestDate: getTodayDateOnlyString(),
        },
        req.file,
      );
      if (payload.error) {
        return res.status(400).json({ error: payload.error });
      }

      const [result] = await db.query(
        `INSERT INTO work_reqs (
          referenceNumber,
          requestDate,
          techName,
          account,
          accountContact,
          accountAddress,
          actionRequired,
          numberOfPlants,
          plantWanted,
          plantReplaced,
          plantSize,
          plantHeight,
          planterTypeSize,
          planterColour,
          stagingMaterial,
          lighting,
          method,
          location,
          notes,
          picturePath,
          assignedTo,
          dueDate,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.referenceNumber,
          payload.requestDate,
          payload.techName,
          payload.account,
          payload.accountContact,
          payload.accountAddress,
          payload.actionRequired,
          payload.numberOfPlants,
          payload.plantWanted,
          payload.plantReplaced,
          payload.plantSize,
          payload.plantHeight,
          payload.planterTypeSize,
          payload.planterColour,
          payload.stagingMaterial,
          payload.lighting,
          payload.method,
          payload.location,
          payload.notes,
          payload.picturePath,
          payload.assignedTo,
          payload.dueDate,
          payload.status,
        ],
      );

      const newRow = { id: result.insertId, ...payload };

      // Fire-and-forget Monday sync
      void (async () => {
        try {
          await mondaySyncService.pushCreate(newRow);
        } catch (err) {
          console.error("[monday-sync] pushCreate failed", err.message);
        }
      })();

      return res.status(201).json({
        ok: true,
        id: result.insertId,
        referenceNumber: payload.referenceNumber,
        picturePath: payload.picturePath,
        status: payload.status,
      });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /reqs
 * Returns work requests intended for the request-management views.
 * The current filter keeps auto-generated internal tasks out of the main REQ listing.
 */
router.get(
  "/",
  verifyToken,
  authorize("technician", "manager", "admin"),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.query);
      const listColumns = `id, referenceNumber, requestDate, techName, account, actionRequired,
            location, picturePath, assignedTo, dueDate, status, monday_item_id, monday_synced_at, created_at`;

      if (pagination) {
        const [countResult] = await db.query(
          `SELECT COUNT(*) as total FROM work_reqs`,
        );
        const [rows] = await db.query(
          `SELECT ${listColumns}
          FROM work_reqs
          ORDER BY id DESC
          LIMIT ? OFFSET ?`,
          [pagination.pageSize, pagination.offset],
        );
        return res.json(
          paginatedResponse(
            rows,
            countResult[0].total,
            pagination.page,
            pagination.pageSize,
          ),
        );
      }

      const [rows] = await db.query(
        `SELECT ${listColumns}
        FROM work_reqs
        ORDER BY id DESC`,
      );
      return res.json({ data: rows });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /reqs/unscheduled
 * Inbox of work requests with no linked schedule_events row.
 *
 * MUST come BEFORE `GET /reqs/:id` so Express does not match "unscheduled"
 * as an id parameter — verified by the workReqScheduleService test suite
 * (`listUnscheduledWorkReqs` has dedicated coverage). Managers-only.
 *
 * Query params:
 *   page, pageSize           — standard pagination (parsePagination)
 *   account=<text>           — partial case-insensitive LIKE on account
 *   assignedTo=<int>         — exact match on assignedTo
 *   assignedToPresent=true   — filters out unassigned rows
 *   includeOlder=true        — drops the default 30-day created_at filter
 */
router.get(
  "/unscheduled",
  verifyToken,
  authorize("manager", "admin"),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.query) || {
        page: 1,
        pageSize: 25,
        offset: 0,
      };

      const filters = {
        account: req.query.account,
        assignedTo: req.query.assignedTo,
        assignedToPresent:
          req.query.assignedToPresent === "true" ||
          req.query.assignedToPresent === true,
        includeOlder:
          req.query.includeOlder === "true" || req.query.includeOlder === true,
      };

      const { rows, total } =
        await workReqScheduleService.listUnscheduledWorkReqs({
          pageSize: pagination.pageSize,
          offset: pagination.offset,
          filters,
        });

      return res.json(
        paginatedResponse(rows, total, pagination.page, pagination.pageSize),
      );
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /reqs/:id/schedule-events
 * List every schedule_events row tied to the given work request. Readable by
 * Technician+ per Decision H (no per-tech ownership gate in v1).
 */
router.get(
  "/:id/schedule-events",
  verifyToken,
  authorize("technician", "manager", "admin"),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) {
        return next(httpError(400, "Invalid id", "VALIDATION_ERROR"));
      }
      const events = await workReqScheduleService.listLinkedEvents(id);
      return res.json({ data: events });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * POST /reqs/:id/schedule-events
 * Schedule a work request — creates a schedule_events row with
 * event_type='request' linked to this work_req. Manager+ only.
 */
router.post(
  "/:id/schedule-events",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) {
        return next(httpError(400, "Invalid id", "VALIDATION_ERROR"));
      }

      const created = await workReqScheduleService.createLinkedEvent({
        workReqId: id,
        body: req.body,
        req,
      });

      return res.status(201).json({ data: created });
    } catch (err) {
      // Service throws Errors with statusCode + code already set.
      return next(err);
    }
  },
);

/**
 * DELETE /reqs/:id/schedule-events/:eventId
 * Unschedule a specific linked event. The service enforces the ownership
 * guard (eventId must belong to the work_req in the URL). Manager+ only.
 */
router.delete(
  "/:id/schedule-events/:eventId",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(req.params.id);
      const eventId = parsePositiveInt(req.params.eventId);
      if (!id || !eventId) {
        return next(httpError(400, "Invalid id", "VALIDATION_ERROR"));
      }

      await workReqScheduleService.deleteLinkedEvent({
        workReqId: id,
        eventId,
        req,
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /reqs/:id
 * Returns the full row so detail views can render all optional request fields.
 * The response includes a `scheduleEvents` array with any linked calendar
 * events so the work request detail page can render them without a second
 * round trip.
 */
router.get(
  "/:id",
  verifyToken,
  authorize("technician", "manager", "admin"),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const row = await getReqById(id);
      if (!row) {
        return res.status(404).json({ error: "REQ not found" });
      }

      const scheduleEvents = await workReqScheduleService.listLinkedEvents(id);

      return res.json({ data: { ...row, scheduleEvents } });
    } catch (err) {
      return next(err);
    }
  },
);

router.put(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  handleUpload,
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const existing = await getReqById(id);
      if (!existing) {
        return res.status(404).json({ error: "REQ not found" });
      }

      const payload = buildReqPayload(req.body, req.file, existing);
      if (payload.error) {
        return res.status(400).json({ error: payload.error });
      }

      // Auto-close hook: when the client opts in AND the status transition is
      // → completed, delete linked schedule_events inside the same transaction
      // as the UPDATE. Rollback of the DELETE also reverts the status change.
      // Monday-inbound completions never run this path (they go direct-SQL in
      // mondayWebhookHandler.js, not through PUT).
      const isCompletionTransition =
        existing.status !== "completed" && payload.status === "completed";
      const autoClose =
        isCompletionTransition && req.body?.autoCloseScheduleEvents === true;

      // Explicit transaction wraps the UPDATE and the optional DELETE. The
      // Monday outbound push fires AFTER commit — outbound HTTP in a DB
      // transaction would stall the connection pool if Monday is slow.
      // Pattern mirrors DELETE /reqs/:id above and reqSequenceService.js.
      let autoCloseDeletedCount = 0;
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        try {
          await conn.query(
            `UPDATE work_reqs
             SET referenceNumber = ?,
                 requestDate = ?,
                 techName = ?,
                 account = ?,
                 accountContact = ?,
                 accountAddress = ?,
                 actionRequired = ?,
                 numberOfPlants = ?,
                 plantWanted = ?,
                 plantReplaced = ?,
                 plantSize = ?,
                 plantHeight = ?,
                 planterTypeSize = ?,
                 planterColour = ?,
                 stagingMaterial = ?,
                 lighting = ?,
                 method = ?,
                 location = ?,
                 notes = ?,
                 picturePath = ?,
                 dueDate = ?,
                 status = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              payload.referenceNumber,
              payload.requestDate,
              payload.techName,
              payload.account,
              payload.accountContact,
              payload.accountAddress,
              payload.actionRequired,
              payload.numberOfPlants,
              payload.plantWanted,
              payload.plantReplaced,
              payload.plantSize,
              payload.plantHeight,
              payload.planterTypeSize,
              payload.planterColour,
              payload.stagingMaterial,
              payload.lighting,
              payload.method,
              payload.location,
              payload.notes,
              payload.picturePath,
              payload.dueDate,
              payload.status,
              id,
            ],
          );

          if (autoClose) {
            const [result] = await conn.query(
              `DELETE FROM schedule_events WHERE work_req_id = ?`,
              [id],
            );
            autoCloseDeletedCount = result?.affectedRows ?? 0;
          }

          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        }
      } finally {
        conn.release();
      }

      // Activity log: fire-and-forget, non-blocking. Only logs when auto-close
      // actually ran so the audit trail reflects the operator's deliberate
      // "clear linked events" choice, not the default completion path.
      if (autoClose) {
        void logActivity({
          req,
          action: "schedule.request.autoclose",
          targetType: "work_req",
          targetId: id,
          metadata: { deleted_count: autoCloseDeletedCount },
        });
      }

      // Fire-and-forget Monday sync (runs AFTER commit — see DELETE handler
      // comment for rationale).
      const updatedRow = {
        id,
        ...payload,
        monday_item_id: existing.monday_item_id,
      };
      void (async () => {
        try {
          await mondaySyncService.pushUpdate(updatedRow);
        } catch (err) {
          console.error("[monday-sync] pushUpdate failed", err.message);
        }
      })();

      return res.json({ ok: true, id });
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(req.params.id);

      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      // Fetch before deleting so we have monday_item_id for sync
      const existing = await getReqById(id);
      if (!existing) {
        return res.status(404).json({ error: "REQ not found" });
      }

      // Orphan cleanup: delete linked schedule_events BEFORE the work_req row.
      // The schedule_events.work_req_id FK is ON DELETE SET NULL, so without
      // this explicit pre-delete, deleting a work request would leave request-
      // typed events with work_req_id = NULL, which render as broken cards on
      // the calendar (no linked reference, no sync badge).
      //
      // Run both statements on a dedicated connection inside a transaction so
      // a mid-sequence failure cannot leave behind a partial delete. The
      // Monday sync push still fires only after commit — never inside the
      // transaction, since it's an outbound HTTP call.
      // Nested try/catch so rollback only runs if beginTransaction succeeded.
      // mysql2's rollback() on an inactive txn is generally tolerant but the
      // explicit nesting makes the intent obvious and avoids any subtle
      // driver-version difference.
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        try {
          await conn.query(
            `DELETE FROM schedule_events WHERE work_req_id = ?`,
            [id],
          );
          await conn.query(`DELETE FROM work_reqs WHERE id = ?`, [id]);
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        }
      } finally {
        conn.release();
      }

      // Fire-and-forget Monday sync (runs AFTER commit — outbound HTTP must
      // never run inside a DB transaction or a slow Monday response stalls
      // the connection pool).
      if (existing.monday_item_id) {
        void (async () => {
          try {
            await mondaySyncService.pushDelete(existing);
          } catch (err) {
            console.error("[monday-sync] pushDelete failed", err.message);
          }
        })();
      }

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
