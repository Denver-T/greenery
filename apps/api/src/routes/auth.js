const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

const employeesController = require("../controllers/employeesController");
const taskController = require("../controllers/taskController");

/**
 * Authorization-Protected Routes
 * ------------------------------
 * This router groups endpoints that require:
 * - a valid Firebase ID token
 * - role-based authorization
 * - optional rate limiting for write operations
 *
 * This is the backend boundary both the web and mobile clients rely on
 * to turn a Firebase-authenticated user into an application employee.
 */

/**
 * GET /auth/me
 * Any authenticated user
 * Returns the authenticated employee based on the email in the verified token.
 *
 * NOTE:
 * This route should only require verifyToken for now.
 * Firebase custom role claims are not guaranteed to exist yet.
 * Employee lookup is performed by email in the controller/service layer.
 */
router.get("/me", verifyToken, employeesController.getMe);

/**
 * POST /auth/employees
 * Admin only
 * Creates a new employee.
 */
router.post(
  "/employees",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  employeesController.create
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
 * Returns only tasks assigned to the authenticated user.
 */
router.get(
  "/my-tasks",
  verifyToken,
  authorize("technician", "manager", "admin"),
  taskController.getMyTasks
);

/**
 * GET /auth/health
 * Protected-route namespace health check.
 */
router.get("/health", verifyToken, (req, res) => {
  return res.status(200).json({
    message: "Auth routes are mounted",
    user: {
      uid: req.user?.uid || null,
      email: req.user?.email || null,
      employeeId: req.user?.employeeId || null,
      role: req.user?.role || null,
      permissionLevel: req.user?.permissionLevel || null,
    },
  });
});

module.exports = router;
