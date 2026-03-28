const express = require("express");

const superAdminController = require("../controllers/superAdminController");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Super-admin routes are intentionally isolated so audit and permission
// governance live behind one explicit backend boundary.
router.get(
  "/logs",
  verifyToken,
  authorize("superadmin"),
  superAdminController.listActivityLogs
);

router.get(
  "/employees",
  verifyToken,
  authorize("superadmin"),
  superAdminController.listAdminCandidates
);

router.patch(
  "/employees/:id/permission-level",
  writeLimiter,
  verifyToken,
  authorize("superadmin"),
  superAdminController.updatePermissionLevel
);

module.exports = router;
