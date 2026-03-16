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
}

/**
 * POST /tasks
 */
async function createTask(req, res, next) {
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
}

/**
 * PATCH /tasks/:id/status
 */
async function updateTaskStatus(req, res, next) {
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

    if (!updatedTask) {
      return next(httpError(404, "Task not found", "TASK_NOT_FOUND"));
    }

    return res.status(200).json({
      data: updatedTask,
    });
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