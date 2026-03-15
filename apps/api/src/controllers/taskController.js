const db = require("../db");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

exports.getTasks = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
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
      return next(
        httpError(400, "Field 'referenceNumber' is required", "VALIDATION_ERROR", [
          { field: "referenceNumber", issue: "required" },
        ])
      );
    }

    if (!isNonEmptyString(requestDate)) {
      return next(
        httpError(400, "Field 'requestDate' is required", "VALIDATION_ERROR", [
          { field: "requestDate", issue: "required" },
        ])
      );
    }

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
  } catch (err) {
    next(err);
  }
};

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

    res.status(200).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
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
        ])
      );
    }

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
  }
};