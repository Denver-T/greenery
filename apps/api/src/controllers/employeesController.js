// apps/api/src/controllers/employeesController.js
// Controller for the canonical `employees` resource and authenticated employee lookup.

const admin = require("../../config/firebase");

const employeesService = require("../services/employeesService");
const { httpError } = require("../utils/httpError");
const { parsePagination, paginatedResponse } = require("../utils/pagination");
const {
  getAccessRank,
  isHighPrivilegePermission,
  normalizeAccessLevel,
  normalizePermissionLevelInput,
  normalizeRoleInput,
} = require("../utils/permissions");
const { logActivity } = require("../utils/activityLogger");
const { toPositiveInt } = require("../utils/validators");

function assertEmployeeWriteAllowed(
  req,
  requestedRole,
  requestedPermission,
  existingEmployee = null
) {
  const actorLevel = normalizeAccessLevel(
    req.user?.permissionLevel || req.user?.role || "technician"
  );
  const nextRole = normalizeRoleInput(
    requestedRole,
    existingEmployee?.role || "Technician"
  );
  const nextPermission = normalizePermissionLevelInput(
    requestedPermission,
    existingEmployee?.permissionLevel || nextRole || "Technician"
  );
  const currentPermission = existingEmployee?.permissionLevel
    ? normalizePermissionLevelInput(existingEmployee.permissionLevel)
    : existingEmployee?.role
      ? normalizePermissionLevelInput(existingEmployee.role)
      : null;
  const currentRole = existingEmployee?.role
    ? normalizeRoleInput(existingEmployee.role)
    : null;

  if (nextPermission === "SuperAdmin" && actorLevel !== "superadmin") {
    throw httpError(
      403,
      "Only super admins can assign SuperAdmin access",
      "AUTH_FORBIDDEN"
    );
  }

  if (isHighPrivilegePermission(nextPermission) && actorLevel !== "superadmin") {
    throw httpError(
      403,
      "Only super admins can assign administrator-level access",
      "AUTH_FORBIDDEN"
    );
  }

  if (
    currentPermission === "SuperAdmin" &&
    actorLevel !== "superadmin"
  ) {
    throw httpError(
      403,
      "Only super admins can modify another super admin",
      "AUTH_FORBIDDEN"
    );
  }

  if (
    actorLevel !== "superadmin" &&
    (nextRole !== "Technician" || nextPermission !== "Technician")
  ) {
    throw httpError(
      403,
      "Only super admins can create or manage non-technician employees",
      "AUTH_FORBIDDEN"
    );
  }

  if (
    actorLevel !== "superadmin" &&
    existingEmployee &&
    (currentRole !== "Technician" || currentPermission !== "Technician")
  ) {
    throw httpError(
      403,
      "Only super admins can modify or remove non-technician employees",
      "AUTH_FORBIDDEN"
    );
  }
}

async function getAll(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    if (pagination) {
      const { rows, totalCount } = await employeesService.listEmployeesPaginated(pagination.pageSize, pagination.offset);
      return res.json(paginatedResponse(rows, totalCount, pagination.page, pagination.pageSize));
    }
    // No pagination params → return all (backward compatible)
    const rows = await employeesService.listEmployees();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid employee id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ]),
      );
    }

    const employee = await employeesService.getEmployeeById(id);

    if (!employee) {
      return next(httpError(404, "Employee not found", "EMPLOYEE_NOT_FOUND"));
    }

    return res.status(200).json({ data: employee });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    assertEmployeeWriteAllowed(req, req.body?.role, req.body?.permissionLevel);

    // Duplicate-email protection lives here so the API can return a precise 409
    // before the write layer is invoked.
    const normalizedEmail =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;

    if (normalizedEmail) {
      const existing = await employeesService.getEmployeeByEmail(normalizedEmail);

      if (existing) {
        return next(
          httpError(409, "An employee with that email already exists", "EMPLOYEE_CONFLICT", [
            { field: "email", issue: "already in use" },
          ]),
        );
      }
    }

    const created = await employeesService.createEmployee(req.body);
    await logActivity({
      req,
      action: "employee.created",
      targetType: "employee",
      targetId: created?.id || null,
      metadata: {
        name: created?.name || null,
        email: created?.email || null,
        role: created?.role || null,
        permissionLevel: created?.permissionLevel || null,
      },
    });
    return res.status(201).json({ data: created });
  } catch (err) {
    if (err.message === "Name is required" || err.message.includes("characters or less") || err.message === "Phone must be in the format xxx-xxx-xxxx") {
      return res.status(400).json({ error: err.message });
    }

    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid employee id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ]),
      );
    }

    const existing = await employeesService.getEmployeeById(id);

    if (!existing) {
      return next(httpError(404, "Employee not found", "EMPLOYEE_NOT_FOUND"));
    }

    assertEmployeeWriteAllowed(
      req,
      req.body?.role,
      req.body?.permissionLevel,
      existing
    );

    // Guard email uniqueness on update as well, excluding the current employee row.
    const normalizedEmail =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;

    if (normalizedEmail) {
      const employeeWithSameEmail = await employeesService.getEmployeeByEmail(normalizedEmail);

      if (employeeWithSameEmail && employeeWithSameEmail.id !== id) {
        return next(
          httpError(409, "An employee with that email already exists", "EMPLOYEE_CONFLICT", [
            { field: "email", issue: "already in use" },
          ]),
        );
      }
    }

    const updated = await employeesService.updateEmployee(id, req.body);
    await logActivity({
      req,
      action:
        existing.permissionLevel !== updated?.permissionLevel
          ? "employee.permission_updated"
          : "employee.updated",
      targetType: "employee",
      targetId: id,
      metadata: {
        before: {
          role: existing.role,
          status: existing.status,
          permissionLevel: existing.permissionLevel,
        },
        after: updated
          ? {
              role: updated.role,
              status: updated.status,
              permissionLevel: updated.permissionLevel,
            }
          : null,
      },
    });

    return res.json({ data: updated });
  } catch (err) {
    if (err.message === "Name is required" || err.message.includes("characters or less") || err.message === "Phone must be in the format xxx-xxx-xxxx") {
      return res.status(400).json({ error: err.message });
    }

    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid employee id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ]),
      );
    }

    const existing = await employeesService.getEmployeeById(id);

    if (getAccessRank(existing?.permissionLevel || existing?.role) >= getAccessRank("superadmin")
      && normalizeAccessLevel(req.user?.permissionLevel || req.user?.role) !== "superadmin") {
      return next(
        httpError(403, "Only super admins can delete a super admin", "AUTH_FORBIDDEN")
      );
    }

    try {
      assertEmployeeWriteAllowed(req, existing?.role, existing?.permissionLevel, existing);
    } catch (err) {
      return next(err);
    }

    const deleted = await employeesService.deleteEmployee(id);

    if (!deleted) {
      return next(httpError(404, "Employee not found", "EMPLOYEE_NOT_FOUND"));
    }

    await logActivity({
      req,
      action: "employee.deleted",
      targetType: "employee",
      targetId: id,
      metadata: {
        name: existing?.name || null,
        email: existing?.email || null,
        permissionLevel: existing?.permissionLevel || null,
      },
    });

    return res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return next(httpError(401, "Authentication required", "AUTH_REQUIRED"));
    }

    // `/auth/me` resolves application identity from the Firebase-authenticated email claim.
    const email =
      typeof req.user.email === "string" ? req.user.email.trim().toLowerCase() : null;

    if (!email) {
      return next(
        httpError(400, "Authenticated token is missing an email claim", "AUTH_INVALID_TOKEN", [
          { field: "email", issue: "missing from authenticated token" },
        ]),
      );
    }

    const employee = await employeesService.getEmployeeByEmail(email);

    if (!employee) {
      return next(httpError(404, "Authenticated employee not found", "EMPLOYEE_NOT_FOUND"));
    }

    return res.status(200).json({ data: employee });
  } catch (err) {
    return next(err);
  }
}

async function removeSelf(req, res, next) {
  try {
    if (!req.user) {
      return next(httpError(401, "Authentication required", "AUTH_REQUIRED"));
    }

    const email =
      typeof req.user.email === "string" ? req.user.email.trim().toLowerCase() : null;

    if (!email) {
      return next(
        httpError(400, "Authenticated token is missing an email claim", "AUTH_INVALID_TOKEN"),
      );
    }

    const employee = await employeesService.getEmployeeByEmail(email);

    if (!employee) {
      return next(httpError(404, "Authenticated employee not found", "EMPLOYEE_NOT_FOUND"));
    }

    // Last-SuperAdmin guard: refuse if this is the only SuperAdmin in the system.
    // Without this, an org can delete itself out of administrative access.
    if (normalizeAccessLevel(employee.permissionLevel) === "superadmin") {
      const superAdminCount = await employeesService.countSuperAdmins();
      if (superAdminCount <= 1) {
        return next(
          httpError(
            409,
            "Cannot delete the last super admin. Promote another administrator first.",
            "LAST_SUPERADMIN",
          ),
        );
      }
    }

    // Audit log BEFORE delete. actor_employee_id will be NULLed by FK cascade
    // when the row is removed, but actor_email survives and metadata captures
    // the full identity at deletion time.
    await logActivity({
      req,
      action: "employee.self_deleted",
      targetType: "employee",
      targetId: employee.id,
      metadata: {
        name: employee.name,
        email: employee.email,
        role: employee.role,
        permissionLevel: employee.permissionLevel,
        firebase_uid: req.user.uid || null,
      },
    });

    const deleted = await employeesService.deleteSelfEmployee(employee.id);

    if (!deleted) {
      return next(httpError(500, "Account deletion failed", "DELETE_FAILED"));
    }

    // Best-effort Firebase user deletion. If this fails the user is already
    // unable to authenticate (no employees row → /auth/me returns 404), so
    // we surface success and let ops clean up the orphan Firebase record.
    try {
      if (req.user.uid) {
        await admin.auth().deleteUser(req.user.uid);
      }
    } catch (firebaseErr) {
      console.warn(
        `[removeSelf] Firebase user deletion failed for uid=${req.user.uid}:`,
        firebaseErr?.message || firebaseErr,
      );
    }

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getMe,
  removeSelf,
};

