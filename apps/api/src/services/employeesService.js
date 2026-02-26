const { getPool } = require("../db");

async function listEmployees() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, name, role, email, phone, status, permissionLevel FROM employees ORDER BY id DESC"
  );
  return rows;
}

async function createEmployee(emp) {
  const pool = getPool();

  const name = (emp.name || "").trim();
  if (!name) throw new Error("Name is required");

  const role = emp.role || "Technician";
  const email = emp.email || null;
  const phone = emp.phone || null;
  const status = emp.status || "Active";
  const permissionLevel = emp.permissionLevel || role;

  const [result] = await pool.query(
    `INSERT INTO employees (name, role, email, phone, status, permissionLevel)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, role, email, phone, status, permissionLevel]
  );

  return { id: result.insertId, name, role, email, phone, status, permissionLevel };
}

async function updateEmployee(id, emp) {
  const pool = getPool();

  const name = (emp.name || "").trim();
  if (!name) throw new Error("Name is required");

  const role = emp.role || "Technician";
  const email = emp.email || null;
  const phone = emp.phone || null;
  const status = emp.status || "Active";
  const permissionLevel = emp.permissionLevel || role;

  const [result] = await pool.query(
    `UPDATE employees
     SET name=?, role=?, email=?, phone=?, status=?, permissionLevel=?
     WHERE id=?`,
    [name, role, email, phone, status, permissionLevel, id]
  );

  return result.affectedRows;
}

async function deleteEmployee(id) {
  const pool = getPool();
  const [result] = await pool.query("DELETE FROM employees WHERE id=?", [id]);
  return result.affectedRows;
}

module.exports = {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};