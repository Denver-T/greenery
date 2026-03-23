const db = require("../db");

// Maps used to bridge API role wording and the DB enum values in `employees`.
const DB_ROLE_MAP = {
  technician: "Technician",
  manager: "Manager",
  admin: "Administrator",
  administrator: "Administrator",
};

const API_ROLE_MAP = {
  Technician: "technician",
  Manager: "manager",
  Administrator: "admin",
};

const VALID_STATUSES = new Set(["Active", "Inactive"]);

const BASE_SELECT = `
  SELECT
    id,
    name,
    role,
    email,
    phone,
    status,
    permissionLevel,
    created_at,
    updated_at
  FROM employees
`;

// The schema requires `name`; all create/update flows normalize through this helper.
function normalizeRequiredName(value) {
  const name = typeof value === "string" ? value.trim() : "";

  if (!name) {
    throw new Error("Name is required");
  }

  return name;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeDbRole(value, defaultRole = "Technician") {
  if (value === undefined || value === null || value === "") {
    return defaultRole;
  }

  const normalized = String(value).trim();
  return DB_ROLE_MAP[normalized.toLowerCase()] || normalized;
}

function normalizeStatus(value, defaultStatus = "Active") {
  if (value === undefined || value === null || value === "") {
    return defaultStatus;
  }

  const normalized = String(value).trim();

  if (VALID_STATUSES.has(normalized)) {
    return normalized;
  }

  const titleCase = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  return VALID_STATUSES.has(titleCase) ? titleCase : defaultStatus;
}

function normalizeEmployeeInput(body = {}) {
  // Normalize once at the service boundary so every write path produces schema-safe values.
  const role = normalizeDbRole(body.role);

  return {
    name: normalizeRequiredName(body.name),
    role,
    email: normalizeOptionalString(body.email),
    phone: normalizeOptionalString(body.phone),
    status: normalizeStatus(body.status),
    permissionLevel: normalizeDbRole(body.permissionLevel, role),
  };
}

function mapEmployeeToAccount(row) {
  // Legacy helper retained for compatibility with older response shapes.
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    role: API_ROLE_MAP[row.role] || String(row.role || "").toLowerCase(),
    email: row.email,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listEmployees() {
  // Default ordering keeps the newest operational records first in admin views.
  const [rows] = await db.query(`${BASE_SELECT} ORDER BY created_at DESC, id DESC`);
  return rows;
}

async function getEmployeeById(id) {
  const [rows] = await db.query(`${BASE_SELECT} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function getEmployeeByEmail(email) {
  const [rows] = await db.query(
    `${BASE_SELECT} WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function createEmployee(body = {}) {
  const employee = normalizeEmployeeInput(body);

  // Service layer owns schema-level persistence details, not the controller.
  const [result] = await db.query(
    `INSERT INTO employees (name, role, email, phone, status, permissionLevel)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      employee.name,
      employee.role,
      employee.email,
      employee.phone,
      employee.status,
      employee.permissionLevel,
    ],
  );

  return getEmployeeById(result.insertId);
}

async function updateEmployee(id, body = {}) {
  const employee = normalizeEmployeeInput(body);

  const [result] = await db.query(
    `UPDATE employees
     SET name = ?, role = ?, email = ?, phone = ?, status = ?, permissionLevel = ?
     WHERE id = ?`,
    [
      employee.name,
      employee.role,
      employee.email,
      employee.phone,
      employee.status,
      employee.permissionLevel,
      id,
    ],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getEmployeeById(id);
}

async function deleteEmployee(id) {
  const [result] = await db.query("DELETE FROM employees WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  mapEmployeeToAccount,
};
