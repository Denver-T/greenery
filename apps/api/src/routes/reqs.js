const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

/**
 * ---------------------------------------------------------
 * Upload configuration
 * ---------------------------------------------------------
 * Uploaded images will be stored in:
 *   apps/api/uploads
 *
 * This route accepts multipart/form-data because your web form
 * uses FormData and includes a file input.
 */

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const safeBase = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `req-${safeBase}${ext}`);
  },
});

const upload = multer({ storage });

/**
 * ---------------------------------------------------------
 * POST /reqs
 * ---------------------------------------------------------
 * Creates a new work request.
 * Accepts:
 * - all text form fields
 * - optional file field called "picture"
 */
router.post("/", upload.single("picture"), async (req, res, next) => {
  try {
    const body = req.body || {};

    // Basic required validation
    if (!body.referenceNumber || !body.date || !body.techName || !body.account) {
      return res.status(400).json({
        error: "referenceNumber, date, techName, and account are required",
      });
    }

    const picturePath = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO work_reqs (
        referenceNumber,
        date,
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
        picturePath
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.referenceNumber,
        body.date,
        body.techName,
        body.account,
        body.accountContact || null,
        body.accountAddress || null,
        body.actionRequired || null,
        body.numberOfPlants ? Number(body.numberOfPlants) : null,
        body.plantWanted || null,
        body.plantReplaced || null,
        body.plantSize || null,
        body.plantHeight || null,
        body.planterTypeSize || null,
        body.planterColour || null,
        body.stagingMaterial || null,
        body.lighting || null,
        body.method || null,
        body.location || null,
        body.notes || null,
        picturePath,
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.insertId,
      referenceNumber: body.referenceNumber,
      picturePath,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ---------------------------------------------------------
 * GET /reqs
 * ---------------------------------------------------------
 * Useful for testing and later for list/review pages.
 */
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        referenceNumber,
        date,
        techName,
        account,
        actionRequired,
        location,
        picturePath,
        created_at
      FROM work_reqs
      ORDER BY id DESC`
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * ---------------------------------------------------------
 * GET /reqs/:id
 * ---------------------------------------------------------
 * Useful if later you want a details page.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const [rows] = await db.query(
      `SELECT * FROM work_reqs WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "REQ not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;