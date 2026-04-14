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
const { httpError } = require("../utils/httpError");

const router = express.Router();

// Ensure upload directory exists before multer attempts to write files.
const uploadDir = path.join(__dirname, "../../uploads");
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
        "Invalid file type. Only JPEG, PNG, and WEBP images are allowed."
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

function isValidDateString(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
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
  const email = typeof req.user?.email === "string" ? req.user.email.trim().toLowerCase() : null;

  if (!email) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT name FROM employees WHERE email = ? LIMIT 1`,
    [email]
  );

  return rows[0]?.name || null;
}

function buildReqPayload(body = {}, file = null, existing = null) {
  const referenceNumber = normalizeString(
    body.referenceNumber ?? existing?.referenceNumber,
    100
  );
  const requestDate = normalizeString(body.requestDate ?? existing?.requestDate, 100);
  const techName = normalizeString(body.techName ?? existing?.techName, 120);
  const account = normalizeString(body.account ?? existing?.account, 150);
  const actionRequired = normalizeString(body.actionRequired ?? existing?.actionRequired, 255);

  if (!referenceNumber || !requestDate || !account || !actionRequired) {
    return {
      error: "referenceNumber, requestDate, account, and actionRequired are required",
    };
  }

  if (!isValidDateString(requestDate)) {
    return { error: "requestDate must be a valid date" };
  }

  const dueDate = normalizeString(body.dueDate ?? existing?.dueDate, 100);
  if (dueDate && !isValidDateString(dueDate)) {
    return { error: "dueDate must be a valid date" };
  }

  const rawNumberOfPlants =
    body.numberOfPlants !== undefined ? body.numberOfPlants : existing?.numberOfPlants;
  const numberOfPlants = parseOptionalPositiveInt(rawNumberOfPlants);
  if (
    rawNumberOfPlants !== undefined &&
    rawNumberOfPlants !== null &&
    rawNumberOfPlants !== "" &&
    numberOfPlants === null
  ) {
    return { error: "numberOfPlants must be a valid non-negative integer" };
  }

  return {
    referenceNumber,
    requestDate,
    techName,
    account,
    actionRequired,
    accountContact: normalizeString(body.accountContact ?? existing?.accountContact, 150),
    accountAddress: normalizeString(body.accountAddress ?? existing?.accountAddress, 255),
    numberOfPlants,
    plantWanted: normalizeString(body.plantWanted ?? existing?.plantWanted, 150),
    plantReplaced: normalizeString(body.plantReplaced ?? existing?.plantReplaced, 150),
    plantSize: normalizeString(body.plantSize ?? existing?.plantSize, 100),
    plantHeight: normalizeString(body.plantHeight ?? existing?.plantHeight, 100),
    planterTypeSize: normalizeString(body.planterTypeSize ?? existing?.planterTypeSize, 100),
    planterColour: normalizeString(body.planterColour ?? existing?.planterColour, 100),
    stagingMaterial: normalizeString(body.stagingMaterial ?? existing?.stagingMaterial, 150),
    lighting: normalizeString(body.lighting ?? existing?.lighting, 100),
    method: normalizeString(body.method ?? existing?.method, 100),
    location: normalizeString(body.location ?? existing?.location, 150),
    notes: normalizeString(body.notes ?? existing?.notes, 2000),
    picturePath: file ? `/uploads/${file.filename}` : existing?.picturePath ?? null,
    assignedTo: existing?.assignedTo ?? null,
    dueDate,
    status: existing?.status || "unassigned",
  };
}

const REQ_COLUMNS = `id, referenceNumber, requestDate, techName, account, accountContact,
  accountAddress, actionRequired, numberOfPlants, plantWanted, plantReplaced, plantSize,
  plantHeight, planterTypeSize, planterColour, stagingMaterial, lighting, method, location,
  notes, picturePath, assignedTo, dueDate, status, monday_item_id, monday_synced_at,
  created_at, updated_at`;

async function getReqById(id) {
  const [rows] = await db.query(
    `SELECT ${REQ_COLUMNS} FROM work_reqs WHERE id = ? LIMIT 1`,
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
        req.file
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
        ]
      );

      const newRow = { id: result.insertId, ...payload };

      // Fire-and-forget Monday sync
      void (async () => {
        try { await mondaySyncService.pushCreate(newRow); }
        catch (err) { console.error("[monday-sync] pushCreate failed", err.message); }
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
  }
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
        return res.json(paginatedResponse(rows, countResult[0].total, pagination.page, pagination.pageSize));
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

      const { rows, total } = await workReqScheduleService.listUnscheduledWorkReqs({
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
  }
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

      await db.query(
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
          id,
        ]
      );

      // Fire-and-forget Monday sync
      const updatedRow = { id, ...payload, monday_item_id: existing.monday_item_id };
      void (async () => {
        try { await mondaySyncService.pushUpdate(updatedRow); }
        catch (err) { console.error("[monday-sync] pushUpdate failed", err.message); }
      })();

      return res.json({ ok: true, id });
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
          try { await mondaySyncService.pushDelete(existing); }
          catch (err) { console.error("[monday-sync] pushDelete failed", err.message); }
        })();
      }

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
