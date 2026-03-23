// apps/api/src/routes/employees.js

const express = require("express");
const router = express.Router();

const employeesController = require("../controllers/employeesController");
const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { writeLimiter } = require("../middleware/rateLimiters");

/**
 * Employees Routes
 * ----------------
 * Protected employee resource endpoints.
 * `employees` is the canonical people table in the current schema.
 *
 * Access model:
 * - technicians, managers, admins can read
 * - managers and admins can create/update
 * - admins can delete
 */

router.get(
  "/",
  verifyToken,
  authorize("technician", "manager", "admin"),
  employeesController.getAll
);

router.get(
  "/:id",
  verifyToken,
  authorize("technician", "manager", "admin"),
  employeesController.getById
);

router.post(
  "/",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  employeesController.create
);

router.put(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("manager", "admin"),
  employeesController.update
);

router.delete(
  "/:id",
  writeLimiter,
  verifyToken,
  authorize("admin"),
  employeesController.remove
);

module.exports = router;
