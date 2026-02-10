const express = require("express");
const taskController = require("../controllers/taskController");

const router = express.Router();

// GET /tasks
router.get("/", taskController.getTasks);

// POST /tasks
router.post("/", taskController.createTask);

// GET /tasks/:id
router.get("/:id", taskController.getTaskById);

// PATCH /tasks/:id/status
router.patch("/:id/status", taskController.updateTaskStatus);

module.exports = router;