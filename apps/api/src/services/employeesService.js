// apps/api/src/services/employeesService.js

const db = require("../db");

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

  const role = body.role || "Technician";
  const email = body.email || null;
  const phone = body.phone || null;
  const status = body.status || "Active";
  const permissionLevel = body.permissionLevel || role;

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

  const role = body.role || "Technician";
  const email = body.email || null;
  const phone = body.phone || null;
  const status = body.status || "Active";
  const permissionLevel = body.permissionLevel || role;

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