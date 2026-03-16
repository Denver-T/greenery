const db = require("../../config/db");
const accountService = require("./accountService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

const TASKS_TABLE = "tasks";
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
      { field: "due_date", issue: "must be a valid datetime string" },
    ]);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, "Invalid due_date", "VALIDATION_ERROR", [
      { field: "due_date", issue: "must be a valid datetime string" },
    ]);
  }

  return value;
}

/**
 * GET all tasks
 */
async function getTasks() {
  const sql = `
    SELECT
      id,
      title,
      status,
      assigned_to,
      plant_id,
      notes,
      due_date,
      created_at,
      updated_at
    FROM ${TASKS_TABLE}
    ORDER BY created_at DESC, id DESC
  `;

  const [rows] = await db.query(sql);
  return rows;
}

/**
 * GET task by ID
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
      title,
      status,
      assigned_to,
      plant_id,
      notes,
      due_date,
      created_at,
      updated_at
    FROM ${TASKS_TABLE}
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [taskId]);
  return rows[0] || null;
}

/**
 * CREATE task
 *
 * Accepted fields:
 * - title (required)
 * - status (optional, defaults to assigned)
 * - assigned_to (optional)
 * - plant_id (optional)
 * - notes (optional)
 * - due_date (optional)
 */
async function createTask(taskData) {
  const rawTitle = taskData?.title;
  const rawStatus = taskData?.status;
  const rawAssignedTo = taskData?.assigned_to ?? taskData?.assignedUserId;
  const rawPlantId = taskData?.plant_id;
  const rawNotes = taskData?.notes;
  const rawDueDate = taskData?.due_date;

  const title = typeof rawTitle === "string" ? rawTitle.trim() : rawTitle;
  const status = normalizeStatus(rawStatus ?? "assigned", true);
  const assignedTo = normalizeOptionalId(rawAssignedTo, "assigned_to");
  const plantId = normalizeOptionalId(rawPlantId, "plant_id");
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

  if (assignedTo) {
    const account = await accountService.getAccountById(assignedTo);

    if (!account) {
      throw httpError(404, "Assigned account does not exist", "ACCOUNT_NOT_FOUND", [
        { field: "assigned_to", issue: "no such account" },
      ]);
    }
  }

  const sql = `
    INSERT INTO ${TASKS_TABLE} (
      title,
      status,
      assigned_to,
      plant_id,
      notes,
      due_date
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    title,
    status,
    assignedTo,
    plantId,
    notes,
    dueDate,
  ]);

  return getTaskById(result.insertId);
}

/**
 * UPDATE task status only
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
    UPDATE ${TASKS_TABLE}
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
 * ASSIGN task to an account
 */
async function assignTask(id, assignedTo) {
  const taskId = toPositiveInt(id);

  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const accountId = normalizeOptionalId(assignedTo, "assigned_to");

  if (!accountId) {
    throw httpError(400, "Invalid assigned_to", "VALIDATION_ERROR", [
      { field: "assigned_to", issue: "must be a positive integer" },
    ]);
  }

  const account = await accountService.getAccountById(accountId);

  if (!account) {
    throw httpError(404, "Assigned account does not exist", "ACCOUNT_NOT_FOUND", [
      { field: "assigned_to", issue: "no such account" },
    ]);
  }

  const sql = `
    UPDATE ${TASKS_TABLE}
    SET
      assigned_to = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [accountId, taskId]);

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