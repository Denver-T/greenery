// apps/api/src/controllers/taskController.js

/**
 * Task Controller
 * ---------------
 * HTTP boundary for Task endpoints.
 *
 * Primary responsibilities:
 * - Validate and normalize request inputs (params/body) as early as possible
 * - Delegate business logic + persistence to the service layer
 * - Return ONLY success responses from controllers
 * - Forward ALL failures to the centralized error handler via next(err)
 *
 * Why this pattern:
 * - Keeps controllers thin and predictable
 * - Makes error formatting consistent (single global error handler)
 * - Improves testability (controllers validate; services implement behavior)
 */

const taskService = require("../services/taskService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

/**
 * GET /tasks
 * Returns all tasks.
 */
exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks();
    return res.status(200).json({ data: tasks });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /tasks
 * Creates a new task.
 *
 * Expected body (current scaffolding):
 * - title: string (required)
 * - status: string (optional)
 * - createUser: (optional; will likely become req.user.uid / req.user.userId later)
 */
exports.createTask = async (req, res, next) => {
  try {
    const { title, status, createUser } = req.body;

    // Validate title
    if (!isNonEmptyString(title)) {
      return next(
        httpError(400, "Field 'title' is required", "VALIDATION_ERROR", [
          { field: "title", issue: "required" },
        ])
      );
    }

    // Validate status (optional)
    if (status !== undefined && !isNonEmptyString(status)) {
      return next(
        httpError(400, "Field 'status' must be a non-empty string", "VALIDATION_ERROR", [
          { field: "status", issue: "must be a non-empty string" },
        ])
      );
    }

    /**
     * NOTE (auth integration):
     * Once auth is wired in, you typically would not accept `createUser` from the client.
     * You would derive it from req.user to prevent spoofing.
     */
    const created = await taskService.createTask({ title, status, createUser });

    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /tasks/:id
 * Returns a task by id.
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const task = await taskService.getTaskById(id);

    if (!task) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    return res.status(200).json({ data: task });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /tasks/:id/status
 * Updates task status.
 *
 * Expected body:
 * - status: string (required)
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    // Validate :id param
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    // Validate request body
    const { status } = req.body;
    if (!isNonEmptyString(status)) {
      return next(
        httpError(400, "Field 'status' is required", "VALIDATION_ERROR", [
          { field: "status", issue: "required" },
        ])
      );
    }

    const updatedTask = await taskService.updateTaskStatus(id, status);

    if (!updatedTask) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    return res.status(200).json({ data: updatedTask });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /tasks/:id/assign
 * Assigns a task to a user.
 *
 * Expected body:
 * - assignedUserId: number (required)
 */
exports.assignTask = async (req, res, next) => {
  try {
    // Validate :id param
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    // Validate body.assignedUserId
    const assignedUserId = toPositiveInt(req.body.assignedUserId);
    if (!assignedUserId) {
      return next(
        httpError(400, "Invalid assignedUserId", "VALIDATION_ERROR", [
          { field: "assignedUserId", issue: "must be a positive integer" },
        ])
      );
    }

    const task = await taskService.assignTask(id, assignedUserId);

    if (!task) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    return res.status(200).json({ data: task });
  } catch (err) {
    return next(err);
  }
};