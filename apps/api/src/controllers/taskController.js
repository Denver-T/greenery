// apps/api/src/controllers/taskController.js
// Controller for the legacy `/tasks` API surface.
// Important: the current schema does not have a dedicated `tasks` table;
// these handlers delegate to a compatibility layer over `work_reqs`.

const taskService = require("../services/taskService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

const VALID_STATUSES = ["assigned", "in_progress", "completed", "cancelled"];

function toDateOnlyString(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getMaxAllowedDueDate() {
  const max = new Date();
  max.setFullYear(max.getFullYear() + 1);
  return toDateOnlyString(max);
}

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
 * Compatibility shape for the /tasks API.
 * The service maps this payload into work_reqs internally.
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

  // Collect validation issues so clients receive one actionable response
  // rather than fixing fields one at a time.
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
 * @returns {{ assigned_to: number|null, due_date: string|null }}
 */
function validateAndNormalizeAssignPayload(body) {
  const rawAssignedTo = body?.assigned_to ?? body?.assignedTo ?? body?.assignedUserId;
  const rawDueDate = body?.due_date ?? body?.dueDate ?? body?.date;
  const assignedTo =
    rawAssignedTo === undefined || rawAssignedTo === null || rawAssignedTo === ""
      ? null
      : toPositiveInt(rawAssignedTo);

  if (rawAssignedTo !== undefined && rawAssignedTo !== null && rawAssignedTo !== "" && !assignedTo) {
    throw httpError(400, "Invalid assigned_to", "VALIDATION_ERROR", [
      { field: "assigned_to", issue: "must be a positive integer" },
    ]);
  }

  if (rawDueDate !== undefined && rawDueDate !== null && rawDueDate !== "") {
    if (typeof rawDueDate !== "string" || Number.isNaN(new Date(rawDueDate).getTime())) {
      throw httpError(400, "Invalid due_date", "VALIDATION_ERROR", [
        { field: "due_date", issue: "must be a valid date string" },
      ]);
    }

    const normalizedDueDate = toDateOnlyString(rawDueDate);
    const today = toDateOnlyString(new Date());
    const maxDueDate = getMaxAllowedDueDate();

    if (normalizedDueDate < today) {
      throw httpError(400, "Invalid due_date", "VALIDATION_ERROR", [
        { field: "due_date", issue: "cannot be in the past" },
      ]);
    }

    if (normalizedDueDate > maxDueDate) {
      throw httpError(400, "Invalid due_date", "VALIDATION_ERROR", [
        { field: "due_date", issue: "cannot be more than one year out" },
      ]);
    }
  }

  return {
    assigned_to: assignedTo,
    due_date: rawDueDate ?? null,
  };
}

/**
 * GET /tasks
 */
async function getTasks(req, res, next) {
  try {
    // `scope=assignment` is used by the web assignment UI to include unassigned work requests.
    const scope = typeof req.query?.scope === "string" ? req.query.scope.trim() : null;
    const tasks = await taskService.getTasks(scope);

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

    const assignment = validateAndNormalizeAssignPayload(req.body);
    const updatedTask = await taskService.assignTask(id, assignment);

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



