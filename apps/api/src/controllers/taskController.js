// apps/api/src/controllers/taskController.js
/**
 * Task Controller
 * ---------------
 * Responsibilities:
 * - Validate incoming HTTP input (params/body) at the boundary
 * - Call the service layer for business logic
 * - Return consistent HTTP responses
 * - Forward unexpected errors to the global error handler via next(err)
 *
 * Notes:
 * - This controller does NOT know about the database.
 * - DB integration will later live inside the service layer.
 */

const taskService = require("../services/taskService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks();
    res.status(200).json({ data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    /**
     * Validate as early as possible (at the API boundary).
     * This prevents bad data from flowing deeper into the system.
     */
    const { title, status, createUser } = req.body;

    if (!isNonEmptyString(title)) {
      return next(
        httpError(400, "Field 'title' is required", "VALIDATION_ERROR", [
          { field: "title", issue: "required" },
        ])
      );
    }

    // status is optional during scaffolding; if provided, it must be non-empty
    if (status !== undefined && !isNonEmptyString(status)) {
      return next(
        httpError(400, "Field 'status' must be a non-empty string", "VALIDATION_ERROR", [
          { field: "status", issue: "must be a non-empty string" },
        ])
      );
    }

    const created = await taskService.createTask({ title, status, createUser  });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    /**
     * Route params are strings by default.
     * Convert and validate :id so downstream code can trust it.
     */
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

    res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const { status } = req.body;

    if (!isNonEmptyString(status)) {
      return next(
        httpError(400, "Field 'status' is required", "VALIDATION_ERROR", [
          { field: "status", issue: "required" },
        ])
      );
    }

    const updated = await taskService.updateTaskStatus(id, { status });

    if (!updated) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};