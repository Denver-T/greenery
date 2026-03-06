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

/**
 * Small helper for consistent table name usage.
 * If you ever rename the table, it’s localized to one constant.
 */
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
 *
 * Expected `taskData` shape (based on your controller):
 * - title: string (required)
 * - status?: string (optional)
 * - createUser?: number (optional)  <-- might later come from req.user.uid mapping
 *
 * NOTE:
 * Your DB insert previously referenced columns like TaskTitle / AssignedUserId etc.
 * That’s totally fine if your schema uses those, but the table name should still
 * be consistent (`tasks`).
 */
exports.createTask = async (taskData) => {
  const pool = await getPool();

  // Defensive validation in the service as a backstop (controller should already validate).
  // This protects you if another caller (tests, cron, future route) calls the service directly.
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

  /**
   * Normalize optional numeric IDs (if provided).
   * `toPositiveInt` returns null/undefined for invalid values, so we can validate.
   */
  const createdByUserId =
    taskData.createUser === undefined ? null : toPositiveInt(taskData.createUser);

  if (taskData.createUser !== undefined && !createdByUserId) {
    throw httpError(400, "Invalid createUser", "VALIDATION_ERROR", [
      { field: "createUser", issue: "must be a positive integer" },
    ]);
  }

  /**
   * IMPORTANT:
   * Your earlier SQL used `INSERT INTO Tasks (...)` (capital T) with columns:
   * (TaskTitle, Status, AssignedUserId, CreatedByUserId, Description, CreateTime)
   *
   * I’m keeping your column naming pattern because it likely matches your schema,
   * but switching the TABLE name to `tasks` for consistency.
   *
   * If your actual schema columns are different, adjust here to match 01_schema.sql.
   */
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
    // Controller expects null and will next(httpError(404...)).
    // Either approach is fine; returning null keeps controller logic unchanged.
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

  /**
   * Domain rule: you can only assign tasks to real users.
   * If userService returns null, we convert to a structured 404/400-type error.
   *
   * Choose 404 vs 400:
   * - 404 (USER_NOT_FOUND): the referenced resource doesn't exist.
   * - 400: invalid input.
   * 404 is usually clearer here.
   */
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