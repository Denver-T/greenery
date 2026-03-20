// apps/api/src/services/employeesService.js

const db = require("../db");

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();

  switch (normalized) {
    case "admin":
    case "administrator":
      return "Administrator";
    case "manager":
      return "Manager";
    case "employee":
    case "technician":
      return "Technician";
    default:
      return "Technician";
  }
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase() === "inactive"
    ? "Inactive"
    : "Active";
}

async function listEmployees() {
  const [rows] = await db.query(
    "SELECT id, name, role, email, phone, status, permissionLevel FROM employees ORDER BY id DESC"
  );

  return rows;
}

async function createEmployee(body = {}) {
  const name = (body.name || "").trim();

  if (!name) {
    throw new Error("Name is required");
  }

  const role = normalizeRole(body.role);
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const status = normalizeStatus(body.status);
  const permissionLevel = normalizeRole(body.permissionLevel || body.role);

  const [result] = await db.query(
    `INSERT INTO employees (name, role, email, phone, status, permissionLevel)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, role, email, phone, status, permissionLevel]
  );

  return {
    id: result.insertId,
    name,
    role,
    email,
    phone,
    status,
    permissionLevel,
  };
}

async function updateEmployee(id, body = {}) {
  const name = (body.name || "").trim();

  if (!name) {
    throw new Error("Name is required");
  }

  const role = normalizeRole(body.role);
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const status = normalizeStatus(body.status);
  const permissionLevel = normalizeRole(body.permissionLevel || body.role);

  const [result] = await db.query(
    `UPDATE employees
     SET name = ?, role = ?, email = ?, phone = ?, status = ?, permissionLevel = ?
     WHERE id = ?`,
    [name, role, email, phone, status, permissionLevel, id]
  );

  return result.affectedRows > 0;
}

async function deleteEmployee(id) {
  const [result] = await db.query("DELETE FROM employees WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
