// apps/api/src/services/taskService.js

const db = require("../../config/db");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

const WORK_REQS_TABLE = "work_reqs";
const EMPLOYEES_TABLE = "employees";
const VALID_STATUSES = ["assigned", "in_progress", "completed", "cancelled"];

function mapWorkReqToTask(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.actionRequired,
    account: row.account,
    location: row.location,
    status: row.status,
    assigned_to: row.assignedTo,
    assignedTo: row.assignedTo,
    plant_id: null,
    notes: row.notes,
    due_date: row.dueDate,
    dueDate: row.dueDate,
    date: row.dueDate,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

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
      { field: "status", issue: `must be one of: ${VALID_STATUSES.join(", ")}` },
    ]);
  }

  return normalized;
}

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

async function ensureEmployeeExists(employeeId) {
  if (!employeeId) {
    return;
  }

  const [rows] = await db.query(
    `SELECT id FROM ${EMPLOYEES_TABLE} WHERE id = ? LIMIT 1`,
    [employeeId]
  );

  if (!rows.length) {
    throw httpError(404, "Assigned employee does not exist", "EMPLOYEE_NOT_FOUND", [
      { field: "assigned_to", issue: "no such employee" },
    ]);
  }
}

async function getTasks(options = {}) {
  const includeUnassigned = options.scope === "assignment";
  const [rows] = await db.query(
    `SELECT
      id,
      actionRequired,
      account,
      location,
      status,
      assignedTo,
      notes,
      dueDate,
      created_at,
      updated_at
    FROM ${WORK_REQS_TABLE}
    WHERE ${
      includeUnassigned
        ? "status IN ('unassigned', 'assigned', 'in_progress', 'completed', 'cancelled')"
        : "status IN ('assigned', 'in_progress', 'completed', 'cancelled')"
    }
    ORDER BY updated_at DESC, id DESC`
  );

  return rows.map(mapWorkReqToTask);
}

async function getTaskById(id) {
  const taskId = toPositiveInt(id);
  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const [rows] = await db.query(
    `SELECT
      id,
      actionRequired,
      account,
      location,
      status,
      assignedTo,
      notes,
      dueDate,
      created_at,
      updated_at
    FROM ${WORK_REQS_TABLE}
    WHERE id = ?
      AND status IN ('unassigned', 'assigned', 'in_progress', 'completed', 'cancelled')
    LIMIT 1`,
    [taskId]
  );

  return mapWorkReqToTask(rows[0] || null);
}

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

  const [result] = await db.query(
    `INSERT INTO ${WORK_REQS_TABLE} (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );

  return getTaskById(result.insertId);
}

async function updateTaskStatus(id, status) {
  const taskId = toPositiveInt(id);
  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const normalizedStatus = normalizeStatus(status, true);
  const [result] = await db.query(
    `UPDATE ${WORK_REQS_TABLE}
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [normalizedStatus, taskId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getTaskById(taskId);
}

async function assignTask(id, assignment) {
  const taskId = toPositiveInt(id);
  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const employeeId = normalizeOptionalId(assignment?.assigned_to, "assigned_to");
  const dueDate = normalizeDueDate(assignment?.due_date);

  await ensureEmployeeExists(employeeId);

  const [result] = await db.query(
    `UPDATE ${WORK_REQS_TABLE}
     SET assignedTo = ?,
         dueDate = ?,
         status = CASE
           WHEN ? IS NULL THEN 'unassigned'
           WHEN status = 'unassigned' THEN 'assigned'
           ELSE status
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [employeeId, dueDate, employeeId, taskId]
  );

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
