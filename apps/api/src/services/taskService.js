// apps/api/src/services/taskService.js

/**
 * Task Service
 * ------------
 * Responsibilities:
 * - Encapsulate all task persistence (DB) operations
 * - Enforce domain rules that are NOT purely HTTP concerns
 * - Throw standardized errors via httpError(...) (never res.status here)
 *
 * Conventions:
 * - Uses the `tasks` table name consistently (lowercase) to match your preference.
 *   (In MySQL on Linux, table name case-sensitivity depends on filesystem settings,
 *   so being consistent avoids “works on my machine” problems.)
 * - Accepts already-validated primitive values from controllers where possible.
 * - Returns plain JS objects/rows; controllers format the HTTP response envelope.
 */

const userService = require("./userService");
const { getPool } = require("../db/index");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

const TASKS_TABLE = "tasks";

/**
 * GET all tasks
 */
exports.getTasks = async () => {
  const pool = await getPool();

  // Avoid SELECT * in production APIs when possible, but acceptable for student scaffolding.
  // If your schema grows, explicitly selecting columns helps keep response stable.
  const [rows] = await pool.query(`SELECT * FROM ${TASKS_TABLE}`);

  return rows;
};

/**
 * CREATE a task
 */
exports.createTask = async (taskData) => {
  const pool = await getPool();

  if (!taskData || !isNonEmptyString(taskData.title)) {
    throw httpError(400, "Field 'title' is required", "VALIDATION_ERROR", [
      { field: "title", issue: "required" },
    ]);
  }

  if (taskData.status !== undefined && !isNonEmptyString(taskData.status)) {
    throw httpError(400, "Field 'status' must be a non-empty string", "VALIDATION_ERROR", [
      { field: "status", issue: "must be a non-empty string" },
    ]);
  }

  const createdByUserId =
    taskData.createUser === undefined ? null : toPositiveInt(taskData.createUser);

  if (taskData.createUser !== undefined && !createdByUserId) {
    throw httpError(400, "Invalid createUser", "VALIDATION_ERROR", [
      { field: "createUser", issue: "must be a positive integer" },
    ]);
  }

  const [result] = await pool.query(
    `
    INSERT INTO tasks
      (title, status, assigned_to, plant_id, notes, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      taskData.title,
      taskData.status || 'assigned',
      taskData.assigned_to || null,  
      taskData.plant_id || null, 
      taskData.notes || null,
      taskData.due_date || null
    ]
  );

  return {
    id: result.insertId,
    ...taskData,
  };
};

/**
 * GET a task by id
 */
exports.getTaskById = async (id) => {
  const pool = await getPool();

  const taskId = toPositiveInt(id);
  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const [rows] = await pool.query(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );

  return rows[0] || null;
};

/**
 * UPDATE task status
 */
exports.updateTaskStatus = async (id, status) => {
  const pool = await getPool();

  const taskId = toPositiveInt(id);
  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  if (!isNonEmptyString(status)) {
    throw httpError(400, "Field 'status' is required", "VALIDATION_ERROR", [
      { field: "status", issue: "required" },
    ]);
  }

  const [result] = await pool.query(
    `
    UPDATE tasks
    SET status = ?
    WHERE id = ?
    `,
    [status, taskId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT * FROM ${TASKS_TABLE} WHERE TaskID = ?`,
    [taskId]
  );

  return rows[0] || null;
};

/**
 * ASSIGN task to a user
 */
exports.assignTask = async (id, assignedUserId) => {
  const pool = await getPool();

  const taskId = toPositiveInt(id);
  if (!taskId) {
    throw httpError(400, "Invalid task id", "VALIDATION_ERROR", [
      { field: "id", issue: "must be a positive integer" },
    ]);
  }

  const userId = toPositiveInt(assignedUserId);
  if (!userId) {
    throw httpError(400, "Invalid assignedUserId", "VALIDATION_ERROR", [
      { field: "assignedUserId", issue: "must be a positive integer" },
    ]);
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    throw httpError(404, "Assigned user does not exist", "USER_NOT_FOUND", [
      { field: "assignedUserId", issue: "no such user" },
    ]);
  }

  const [result] = await pool.query(
    `
    UPDATE ${TASKS_TABLE}
    SET AssignedUserId = ?, ChangeTime = NOW()
    WHERE TaskID = ?
    `,
    [userId, taskId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT * FROM tasks WHERE id = ?`,
    [id]
  );

  return rows[0];
};

exports.assignTask = async (id, assignedUserId) => {
   const pool = await getPool();
  if (!assignedUserId) {
    throw new Error("assignedUserId is required");
  }

  const user = await userService.getUserById(assignedUserId);
  if (!user) {
    throw new Error("Assigned user does not exist");
  }

  const [result] = await pool.query(
    `
    UPDATE tasks
    SET assigned_to = ?
    WHERE id = ?
    `,
    [assignedUserId, id]
  );

  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );

  return rows[0] || null;
};