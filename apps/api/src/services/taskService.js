// apps/api/src/services/taskService.js

const db = require("../../config/db");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

const WORK_REQS_TABLE = "work_reqs";
const EMPLOYEES_TABLE = "employees";
const VALID_STATUSES = ["assigned", "in_progress", "completed", "cancelled"];

/**
 * Convert a work_reqs row into the task-shaped response
 * expected by the existing /tasks API.
 */
function mapWorkReqToTask(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.actionRequired,
    status: row.status,
    assigned_to: row.assignedTo,
    plant_id: null,
    notes: row.notes,
    due_date: row.dueDate,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
 * Normalize optional positive integer input.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {number|null}
 */
function normalizeOptionalId(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = toPositiveInt(value);

  if (!parsed) {
    throw httpError(400, `Invalid ${fieldName}`, "VALIDATION_ERROR", [
      { field: fieldName, issue: "must be a positive integer" },
    ]);
  }

  return parsed;
}

/**
 * Normalize and validate task status.
 *
 * @param {unknown} value
 * @param {boolean} required
 * @returns {string|null}
 */
function normalizeStatus(value, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw httpError(400, "Field 'status' is required", "VALIDATION_ERROR", [
        { field: "status", issue: "required" },
      ]);
    }

    return null;
  }

  if (typeof value !== "string") {
    throw httpError(400, "Field 'status' must be a string", "VALIDATION_ERROR", [
      { field: "status", issue: "must be a string" },
    ]);
  }

  const normalized = value.trim().toLowerCase();

  if (!VALID_STATUSES.includes(normalized)) {
    throw httpError(400, "Invalid task status", "VALIDATION_ERROR", [
      {
        field: "status",
        issue: `must be one of: ${VALID_STATUSES.join(", ")}`,
      },
    ]);
  }

  return normalized;
}

/**
 * Normalize due_date.
 * Accepts null/empty or a date string that JS can parse.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeDueDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw httpError(400, "Field 'due_date' must be a string", "VALIDATION_ERROR", [
      { field: "due_date", issue: "must be a valid date string" },
    ]);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, "Invalid due_date", "VALIDATION_ERROR", [
      { field: "due_date", issue: "must be a valid date string" },
    ]);
  }

  return value;
}

/**
 * Verify assigned employee exists.
 *
 * @param {number|null} employeeId
 * @returns {Promise<void>}
 */
async function ensureEmployeeExists(employeeId) {
  if (!employeeId) {
    return;
  }

  const sql = `
    SELECT id
    FROM ${EMPLOYEES_TABLE}
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [employeeId]);

  if (!rows.length) {
    throw httpError(404, "Assigned employee does not exist", "EMPLOYEE_NOT_FOUND", [
      { field: "assigned_to", issue: "no such employee" },
    ]);
  }
}

/**
 * GET all tasks
 * Backed by work_reqs rows that are already in the task lifecycle.
 */
async function getTasks() {
  const sql = `
    SELECT
      id,
      actionRequired,
      status,
      assignedTo,
      notes,
      dueDate,
      created_at,
      updated_at
    FROM ${WORK_REQS_TABLE}
    WHERE status IN ('assigned', 'in_progress', 'completed', 'cancelled')
    ORDER BY updated_at DESC, id DESC
  `;

  const [rows] = await db.query(sql);
  return rows.map(mapWorkReqToTask);
}

/**
 * GET task by ID
 * Reads from work_reqs and maps to the task-shaped response.
 */
async function getTaskById(id) {
  const taskId = toPositiveInt(id);

  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const sql = `
    SELECT
      id,
      actionRequired,
      status,
      assignedTo,
      notes,
      dueDate,
      created_at,
      updated_at
    FROM ${WORK_REQS_TABLE}
    WHERE id = ?
      AND status IN ('assigned', 'in_progress', 'completed', 'cancelled')
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [taskId]);
  return mapWorkReqToTask(rows[0] || null);
}

/**
 * CREATE task
 *
 * Compatibility layer:
 * - keeps the /tasks API shape
 * - persists into work_reqs
 * - generates the req-style required fields internally
 */
async function createTask(taskData) {
  const rawTitle = taskData?.title;
  const rawStatus = taskData?.status;
  const rawAssignedTo = taskData?.assigned_to ?? taskData?.assignedUserId;
  const rawNotes = taskData?.notes;
  const rawDueDate = taskData?.due_date;

  const title = typeof rawTitle === "string" ? rawTitle.trim() : rawTitle;
  const status = normalizeStatus(rawStatus ?? "assigned", true);
  const assignedTo = normalizeOptionalId(rawAssignedTo, "assigned_to");
  const notes = normalizeOptionalString(rawNotes);
  const dueDate = normalizeDueDate(rawDueDate);

  if (!isNonEmptyString(title)) {
    throw httpError(400, "Field 'title' is required", "VALIDATION_ERROR", [
      { field: "title", issue: "required" },
    ]);
  }

  if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== "string") {
    throw httpError(400, "Field 'notes' must be a string", "VALIDATION_ERROR", [
      { field: "notes", issue: "must be a string" },
    ]);
  }

  await ensureEmployeeExists(assignedTo);

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const referenceNumber = `TASK-${Date.now()}`;

  const sql = `
    INSERT INTO ${WORK_REQS_TABLE} (
      referenceNumber,
      requestDate,
      techName,
      account,
      accountContact,
      accountAddress,
      actionRequired,
      numberOfPlants,
      plantWanted,
      plantReplaced,
      plantSize,
      plantHeight,
      planterTypeSize,
      planterColour,
      stagingMaterial,
      lighting,
      method,
      location,
      notes,
      picturePath,
      assignedTo,
      dueDate,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    referenceNumber,
    isoDate,
    null,
    "Internal Task",
    null,
    null,
    title,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    notes,
    null,
    assignedTo,
    dueDate,
    status,
  ]);

  return getTaskById(result.insertId);
}

/**
 * UPDATE task status only
 * Updates work_reqs.status.
 */
async function updateTaskStatus(id, status) {
  const taskId = toPositiveInt(id);

  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const normalizedStatus = normalizeStatus(status, true);

  const sql = `
    UPDATE ${WORK_REQS_TABLE}
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [normalizedStatus, taskId]);

  if (result.affectedRows === 0) {
    return null;
  }

  return getTaskById(taskId);
}

/**
 * ASSIGN task to an employee
 * Updates work_reqs.assignedTo.
 */
async function assignTask(id, assignedTo) {
  const taskId = toPositiveInt(id);

  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const employeeId = normalizeOptionalId(assignedTo, "assigned_to");

  if (!employeeId) {
    throw httpError(400, "Invalid assigned_to", "VALIDATION_ERROR", [
      { field: "assigned_to", issue: "must be a positive integer" },
    ]);
  }

  await ensureEmployeeExists(employeeId);

  const sql = `
    UPDATE ${WORK_REQS_TABLE}
    SET
      assignedTo = ?,
      status = CASE
        WHEN status = 'unassigned' THEN 'assigned'
        ELSE status
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [employeeId, taskId]);

  if (result.affectedRows === 0) {
    return null;
  }

  return getTaskById(taskId);
}

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTaskStatus,
  assignTask,
};