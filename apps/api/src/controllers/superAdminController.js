// Super-admin controller
// ----------------------
// This controller owns platform-governance endpoints rather than day-to-day operations.
// Keep privileged concerns here so employee CRUD and operational routes stay simpler.

const db = require("../db");
const employeesService = require("../services/employeesService");
const { httpError } = require("../utils/httpError");
const { logActivity } = require("../utils/activityLogger");
const { normalizePermissionLevelInput } = require("../utils/permissions");
const { toPositiveInt } = require("../utils/validators");

async function listActivityLogs(req, res, next) {
  try {
    // The limit is capped so one governance page refresh cannot accidentally pull the entire
    // audit history into memory. If deeper audit exports are needed later, add a paginated route.
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 200)
      : 50;

    const [rows] = await db.query(
      `SELECT
        id,
        actor_employee_id,
        actor_email,
        actor_permission_level,
        action,
        target_type,
        target_id,
        metadata,
        created_at
      FROM activity_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
      [limit]
    );

    const parsedRows = rows.map((row) => ({
      ...row,
      metadata:
        typeof row.metadata === "string"
          ? (() => {
              try {
                return JSON.parse(row.metadata);
              } catch {
                return row.metadata;
              }
            })()
          : row.metadata,
    }));

    return res.json({ data: parsedRows });
  } catch (err) {
    return next(err);
  }
}

async function listAdminCandidates(req, res, next) {
  try {
    // The web governance UI needs one employee list for promotions. Filtering to active employees
    // keeps the action list focused on accounts that are currently usable.
    const rows = await employeesService.listEmployees();
    return res.json({
      data: rows.filter((row) => row.status === "Active"),
    });
  } catch (err) {
    return next(err);
  }
}

async function updatePermissionLevel(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid employee id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const existing = await employeesService.getEmployeeById(id);

    if (!existing) {
      return next(httpError(404, "Employee not found", "EMPLOYEE_NOT_FOUND"));
    }

    const nextPermission = normalizePermissionLevelInput(
      req.body?.permissionLevel,
      existing.permissionLevel || existing.role
    );

    // Reuse the canonical employee update service so permission changes flow through the same
    // schema normalization and row-shaping logic as the rest of the employee module.
    const updated = await employeesService.updateEmployee(id, {
      ...existing,
      permissionLevel: nextPermission,
    });

    await logActivity({
      req,
      action: "permission.level_updated",
      targetType: "employee",
      targetId: id,
      metadata: {
        before: existing.permissionLevel || existing.role || null,
        after: updated?.permissionLevel || null,
      },
    });

    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listActivityLogs,
  listAdminCandidates,
  updatePermissionLevel,
};
