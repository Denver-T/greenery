// apps/api/src/routes/plants.js

const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const plantController = require("../controllers/plantController");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

const uploadDir = path.join(__dirname, "../../uploads/plants");
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
    cb(null, `plant-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const err = new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed.");
      err.statusCode = 400;
      err.code = "INVALID_FILE_TYPE";
      return cb(err);
    }

    return cb(null, true);
  },
});

function handleUpload(req, res, next) {
  upload.single("imageFile")(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      return next(err);
    }

    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    return next(err);
  });
}

/**
 * Plants Routes
 * -------------
 * Thin resource router over the `plants` table.
 */
router.get(
  "/",
  verifyToken,
  authorize("technician", "manager", "admin"),
  plantController.getPlants,
);

router.get(
  "/:id",
  verifyToken,
  authorize("technician", "manager", "admin"),
  plantController.getPlantById,
);

router.post(
  "/",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  handleUpload,
  plantController.createPlant,
);

router.put(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  handleUpload,
  plantController.updatePlant,
);

router.delete(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  plantController.deletePlant,
);

module.exports = router;
