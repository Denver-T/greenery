// apps/api/src/controllers/employeesController.js
// Controller for the canonical `employees` resource and authenticated employee lookup.

const employeesService = require("../services/employeesService");
const { httpError } = require("../utils/httpError");
const { toPositiveInt } = require("../utils/validators");

async function getAll(req, res, next) {
  try {
    // Read endpoints intentionally return the DB-shaped employee rows
    // because the current web/mobile clients consume those fields directly.
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
    return res.status(201).json({ data: created });
  } catch (err) {
    if (err.message === "Name is required") {
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

    return res.json({ data: updated });
  } catch (err) {
    if (err.message === "Name is required") {
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

    const deleted = await employeesService.deleteEmployee(id);

    if (!deleted) {
      return next(httpError(404, "Employee not found", "EMPLOYEE_NOT_FOUND"));
    }

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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getMe,
};
