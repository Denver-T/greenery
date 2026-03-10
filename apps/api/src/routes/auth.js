// apps/api/src/routes/auth.js

const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

const accountController = require("../controllers/accountController");
const taskController = require("../controllers/taskController");

/**
 * Authorization-Protected Routes
 * ------------------------------
 * This router groups endpoints that require:
 * - a valid Firebase ID token
 * - role-based authorization
 * - optional rate limiting for write operations
 *
 * Middleware order:
 * 1) writeLimiter (for write routes)
 * 2) verifyToken
 * 3) authorize(...)
 * 4) controller
 */

/**
 * POST /auth/accounts
 * Admin only
 * Creates a new account.
 */
router.post(
  "/accounts",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  accountController.createAccount
);

/**
 * POST /auth/tasks
 * Manager and admin only
 * Creates a task.
 */
router.post(
  "/tasks",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  taskController.createTask
);

/**
 * GET /auth/my-tasks
 * Authenticated technicians, managers, and admins
 * Temporary implementation uses getTasks until a dedicated
 * getMyTasks controller is added.
 */
router.get(
  "/my-tasks",
  verifyToken,
  authorize("technician", "manager", "admin"),
  taskController.getTasks
);

/**
 * GET /auth/health
 * Simple protected-route namespace health check.
 */
router.get("/health", (req, res) => {
  return res.status(200).json({
    message: "Auth routes are mounted",
  });
});

module.exports = router;