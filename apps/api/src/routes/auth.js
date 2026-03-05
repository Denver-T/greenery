// apps/api/src/routes/auth.js

const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

// Admin only
router.post(
  "/users",
  writeLimiter,
  verifyToken,
  authorize("administrator"),
  createUserController
);

// Manager + Admin
router.post(
  "/tasks",
  writeLimiter,
  verifyToken,
  authorize("manager", "administrator"),
  createTaskController
);

// All authenticated users
router.get(
  "/my-tasks",
  verifyToken,
  authorize("technician", "manager", "administrator"),
  getMyTasksController
);

module.exports = router;