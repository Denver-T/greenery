const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");


// Admin only
router.post(
  "/users",
  verifyToken,
  authorize("administrator"),
  createUserController
);


// Manager + Admin
router.post(
  "/tasks",
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