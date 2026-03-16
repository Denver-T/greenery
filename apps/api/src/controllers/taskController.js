<<<<<<< HEAD
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
=======
const db = require("../db");
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

/**
 * GET /tasks
 * Returns all tasks.
 */
exports.getTasks = async (req, res, next) => {
  try {
<<<<<<< HEAD
    const tasks = await taskService.getTasks();
    return res.status(200).json({ data: tasks });
=======
    if (req.query.scope === "assignment") {
      const [rows] = await db.query(`
        SELECT
          id,
          actionRequired AS title,
          account,
          location,
          assignedTo,
          dueDate AS date,
          status
        FROM work_reqs
        ORDER BY id DESC
      `);

      return res.status(200).json(rows);
    }

    const [rows] = await db.query(`
      SELECT *
      FROM work_reqs
      ORDER BY id DESC
    `);

    res.status(200).json(rows);
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
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
<<<<<<< HEAD
    const { title, status, createUser } = req.body;

    // Validate title
    if (!isNonEmptyString(title)) {
=======
    const {
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
      status,
    } = req.body || {};

    if (!isNonEmptyString(referenceNumber)) {
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
      return next(
        httpError(400, "Field 'referenceNumber' is required", "VALIDATION_ERROR", [
          { field: "referenceNumber", issue: "required" },
        ])
      );
    }

<<<<<<< HEAD
    // Validate status (optional)
    if (status !== undefined && !isNonEmptyString(status)) {
=======
    if (!isNonEmptyString(requestDate)) {
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
      return next(
        httpError(400, "Field 'requestDate' is required", "VALIDATION_ERROR", [
          { field: "requestDate", issue: "required" },
        ])
      );
    }

<<<<<<< HEAD
    /**
     * NOTE (auth integration):
     * Once auth is wired in, you typically would not accept `createUser` from the client.
     * You would derive it from req.user to prevent spoofing.
     */
    const created = await taskService.createTask({ title, status, createUser });

    return res.status(201).json({ data: created });
=======
    if (!isNonEmptyString(account)) {
      return next(
        httpError(400, "Field 'account' is required", "VALIDATION_ERROR", [
          { field: "account", issue: "required" },
        ])
      );
    }

    if (!isNonEmptyString(actionRequired)) {
      return next(
        httpError(400, "Field 'actionRequired' is required", "VALIDATION_ERROR", [
          { field: "actionRequired", issue: "required" },
        ])
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO work_reqs (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        referenceNumber,
        requestDate,
        techName ?? null,
        account,
        accountContact ?? null,
        accountAddress ?? null,
        actionRequired,
        numberOfPlants ?? null,
        plantWanted ?? null,
        plantReplaced ?? null,
        plantSize ?? null,
        plantHeight ?? null,
        planterTypeSize ?? null,
        planterColour ?? null,
        stagingMaterial ?? null,
        lighting ?? null,
        method ?? null,
        location ?? null,
        notes ?? null,
        picturePath ?? null,
        assignedTo ?? null,
        dueDate ?? null,
        status ?? "unassigned",
      ]
    );

    const [rows] = await db.query(
      `
      SELECT *
      FROM work_reqs
      WHERE id = ?
      `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
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

    const [rows] = await db.query(
      `
      SELECT *
      FROM work_reqs
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

<<<<<<< HEAD
    return res.status(200).json({ data: task });
=======
    res.status(200).json(rows[0]);
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
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
<<<<<<< HEAD
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
=======
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid task id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const { status, assignedTo, date } = req.body || {};

    if (
      status !== undefined &&
      !["unassigned", "assigned", "in_progress", "completed", "cancelled"].includes(status)
    ) {
      return next(
        httpError(400, "Invalid status value", "VALIDATION_ERROR", [
          { field: "status", issue: "invalid enum value" },
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
        ])
      );
    }

<<<<<<< HEAD
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
=======
    const [result] = await db.query(
      `
      UPDATE work_reqs
      SET
        status = COALESCE(?, status),
        assignedTo = ?,
        dueDate = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        status ?? null,
        assignedTo ?? null,
        date ?? null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    const [rows] = await db.query(
      `
      SELECT *
      FROM work_reqs
      WHERE id = ?
      `,
      [id]
    );

    res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
>>>>>>> d9abc52815ef9a405cbd598efc9abe136b56d386
  }
};