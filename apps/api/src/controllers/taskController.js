// apps/api/src/controllers/taskController.js

const taskService = require("../services/taskService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

const VALID_STATUSES = ["assigned", "in_progress", "completed", "cancelled"];

/**
 * Normalize optional string input.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Validate and normalize create-task payload.
 *
 * Supported fields:
 * - title (required)
 * - status (optional)
 * - assigned_to / assignedUserId (optional)
 * - plant_id (optional)
 * - notes (optional)
 * - due_date (optional)
 */
function validateAndNormalizeCreateTaskPayload(body) {
  const rawTitle = body?.title;
  const rawStatus = body?.status;
  const rawAssignedTo = body?.assigned_to ?? body?.assignedUserId;
  const rawPlantId = body?.plant_id;
  const rawNotes = body?.notes;
  const rawDueDate = body?.due_date;

  const title = typeof rawTitle === "string" ? rawTitle.trim() : rawTitle;
  const status = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : rawStatus;
  const notes = normalizeOptionalString(rawNotes);

  const details = [];

  if (!isNonEmptyString(title)) {
    details.push({ field: "title", issue: "required" });
  }

  if (rawStatus !== undefined) {
    if (!isNonEmptyString(status)) {
      details.push({ field: "status", issue: "must be a non-empty string" });
    } else if (!VALID_STATUSES.includes(status)) {
      details.push({
        field: "status",
        issue: `must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
  }

  const assignedTo =
    rawAssignedTo === undefined || rawAssignedTo === null || rawAssignedTo === ""
      ? null
      : toPositiveInt(rawAssignedTo);

  if (rawAssignedTo !== undefined && rawAssignedTo !== null && rawAssignedTo !== "" && !assignedTo) {
    details.push({ field: "assigned_to", issue: "must be a positive integer" });
  }

  const plantId =
    rawPlantId === undefined || rawPlantId === null || rawPlantId === ""
      ? null
      : toPositiveInt(rawPlantId);

  if (rawPlantId !== undefined && rawPlantId !== null && rawPlantId !== "" && !plantId) {
    details.push({ field: "plant_id", issue: "must be a positive integer" });
  }

  if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== "string") {
    details.push({ field: "notes", issue: "must be a string" });
  }

  if (rawDueDate !== undefined && rawDueDate !== null && rawDueDate !== "") {
    if (typeof rawDueDate !== "string" || Number.isNaN(new Date(rawDueDate).getTime())) {
      details.push({ field: "due_date", issue: "must be a valid datetime string" });
    }
  }

  if (details.length > 0) {
    throw httpError(400, "Invalid task payload", "VALIDATION_ERROR", details);
  }

  return {
    title,
    status: status ?? null,
    assigned_to: assignedTo,
    plant_id: plantId,
    notes,
    due_date: rawDueDate ?? null,
  };
}

/**
 * Validate and normalize status payload.
 *
 * @param {object} body
 * @returns {string}
 */
function validateAndNormalizeStatusPayload(body) {
  const rawStatus = body?.status;
  const status = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : rawStatus;

  if (!isNonEmptyString(status)) {
    throw httpError(400, "Field 'status' is required", "VALIDATION_ERROR", [
      { field: "status", issue: "required" },
    ]);
  }

  if (!VALID_STATUSES.includes(status)) {
    throw httpError(400, "Invalid task status", "VALIDATION_ERROR", [
      {
        field: "status",
        issue: `must be one of: ${VALID_STATUSES.join(", ")}`,
      },
    ]);
  }

  return status;
}

/**
 * Validate and normalize assign payload.
 *
 * @param {object} body
 * @returns {number}
 */
function validateAndNormalizeAssignPayload(body) {
  const rawAssignedTo = body?.assigned_to ?? body?.assignedUserId;
  const assignedTo = toPositiveInt(rawAssignedTo);

  if (!assignedTo) {
    throw httpError(400, "Invalid assigned_to", "VALIDATION_ERROR", [
      { field: "assigned_to", issue: "must be a positive integer" },
    ]);
  }

  return assignedTo;
}

/**
 * GET /tasks
 */
async function getTasks(req, res, next) {
  try {
    const tasks = await taskService.getTasks();

    return res.status(200).json({
      data: tasks,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /tasks
 */
async function createTask(req, res, next) {
  try {
    const payload = validateAndNormalizeCreateTaskPayload(req.body);
    const createdTask = await taskService.createTask(payload);

    return res.status(201).json({
      data: createdTask,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /tasks/:id
 */
async function getTaskById(req, res, next) {
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

    return res.status(200).json({
      data: task,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /tasks/:id/status
 */
async function updateTaskStatus(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const status = validateAndNormalizeStatusPayload(req.body);
    const updatedTask = await taskService.updateTaskStatus(id, status);

    if (!updatedTask) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    return res.status(200).json({
      data: updatedTask,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /tasks/:id/assign
 */
async function assignTask(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const assignedTo = validateAndNormalizeAssignPayload(req.body);
    const updatedTask = await taskService.assignTask(id, assignedTo);

    if (!updatedTask) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    return res.status(200).json({
      data: updatedTask,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getTasks,
  createTask,
  getTaskById,
  updateTaskStatus,
  assignTask,
};