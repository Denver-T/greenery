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
      const body = req.body || {};

      const referenceNumber = normalizeString(body.referenceNumber, 100);
      const requestDate = normalizeString(body.requestDate, 100);
      const techName = normalizeString(body.techName, 120);
      const account = normalizeString(body.account, 150);

      const actionRequired = normalizeString(body.actionRequired, 255);

      if (!referenceNumber || !requestDate || !account || !actionRequired) {
        return res.status(400).json({
          error:
            "referenceNumber, requestDate, account, and actionRequired are required",
        });
      }

      if (!isValidDateString(requestDate)) {
        return res.status(400).json({
          error: "requestDate must be a valid date",
        });
      }

      const dueDate = normalizeString(body.dueDate, 100);
      if (dueDate && !isValidDateString(dueDate)) {
        return res.status(400).json({
          error: "dueDate must be a valid date",
        });
      }

      const numberOfPlants = parseOptionalPositiveInt(body.numberOfPlants);
      if (
        body.numberOfPlants !== undefined &&
        body.numberOfPlants !== null &&
        body.numberOfPlants !== "" &&
        numberOfPlants === null
      ) {
        return res.status(400).json({
          error: "numberOfPlants must be a valid non-negative integer",
        });
      }

      const picturePath = req.file ? `/uploads/${req.file.filename}` : null;

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
          referenceNumber,
          requestDate,
          techName,
          account,
          normalizeString(body.accountContact, 150),
          normalizeString(body.accountAddress, 255),
          actionRequired,
          numberOfPlants,
          normalizeString(body.plantWanted, 150),
          normalizeString(body.plantReplaced, 150),
          normalizeString(body.plantSize, 100),
          normalizeString(body.plantHeight, 100),
          normalizeString(body.planterTypeSize, 100),
          normalizeString(body.planterColour, 100),
          normalizeString(body.stagingMaterial, 150),
          normalizeString(body.lighting, 100),
          normalizeString(body.method, 100),
          normalizeString(body.location, 150),
          normalizeString(body.notes, 2000),
          picturePath,
          null,
          dueDate,
          "unassigned",
        ]
      );

      return res.status(201).json({
        ok: true,
        id: result.insertId,
        referenceNumber,
        picturePath,
        status: "unassigned",
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
      const [rows] = await db.query(
        `SELECT
          id,
          referenceNumber,
          requestDate,
          techName,
          account,
          actionRequired,
          location,
          picturePath,
          assignedTo,
          dueDate,
          status,
          created_at
        FROM work_reqs
        WHERE referenceNumber LIKE 'REQ-%'
        ORDER BY id DESC`
      );

      return res.json({ data: rows });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /reqs/:id
 * Returns the full row so detail views can render all optional request fields.
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

      const [rows] = await db.query(`SELECT * FROM work_reqs WHERE id = ?`, [
        id,
      ]);

      if (!rows.length) {
        return res.status(404).json({ error: "REQ not found" });
      }

      return res.json({ data: rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
