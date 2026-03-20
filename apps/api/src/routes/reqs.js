// apps/api/src/routes/reqs.js

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");

const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

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
    fileSize: 5 * 1024 * 1024,
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

function buildReqPayload(body = {}, file = null, existing = null) {
  const referenceNumber = normalizeString(
    body.referenceNumber ?? existing?.referenceNumber,
    100
  );
  const requestDate = normalizeString(body.requestDate ?? existing?.requestDate, 100);
  const techName = normalizeString(body.techName ?? existing?.techName, 120);
  const account = normalizeString(body.account ?? existing?.account, 150);

  if (!referenceNumber || !requestDate || !techName || !account) {
    return {
      error: "referenceNumber, requestDate, techName, and account are required",
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
    accountContact: normalizeString(body.accountContact ?? existing?.accountContact, 150),
    accountAddress: normalizeString(body.accountAddress ?? existing?.accountAddress, 255),
    actionRequired: normalizeString(body.actionRequired ?? existing?.actionRequired, 255),
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

async function getReqById(id) {
  const [rows] = await db.query(`SELECT * FROM work_reqs WHERE id = ?`, [id]);
  return rows[0] || null;
}

router.post(
  "/",
  writeLimiter,
  verifyToken,
  authorize("technician", "manager", "admin"),
  handleUpload,
  async (req, res, next) => {
    try {
      const payload = buildReqPayload(req.body, req.file);
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
        ORDER BY id DESC`
      );

      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
);

router.get(
  "/:id",
  verifyToken,
  authorize("technician", "manager", "admin"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const row = await getReqById(id);
      if (!row) {
        return res.status(404).json({ error: "REQ not found" });
      }

      return res.json(row);
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
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
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
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const [result] = await db.query(`DELETE FROM work_reqs WHERE id = ?`, [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "REQ not found" });
      }

      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
