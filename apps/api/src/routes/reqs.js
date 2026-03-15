const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

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
 * POST /reqs
 * Creates a new work request
 */
router.post("/", upload.single("picture"), async (req, res, next) => {
  try {
    const body = req.body || {};

    if (!body.referenceNumber || !body.requestDate || !body.techName || !body.account) {
      return res.status(400).json({
        error: "referenceNumber, requestDate, techName, and account are required",
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
        body.referenceNumber,
        body.requestDate,
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
        null,
        null,
        "unassigned",
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
 * GET /reqs
 */
router.get("/", async (req, res, next) => {
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

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reqs/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const [rows] = await db.query(`SELECT * FROM work_reqs WHERE id = ?`, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: "REQ not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;