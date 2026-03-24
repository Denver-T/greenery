// apps/api/src/routes/plants.js

const express = require("express");
const router = express.Router();

const plantController = require("../controllers/plantController");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

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
  plantController.createPlant,
);

module.exports = router;
