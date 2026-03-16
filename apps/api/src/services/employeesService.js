const { getPool } = require("../db");
const { validateString, validateEmail, validatePhone, validateEnum } = require("../utils/validators");

async function listEmployees() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, name, role, email, phone, status, permissionLevel FROM employees ORDER BY id DESC"
  );
  return rows;
}

async function createEmployee(emp) {
  const pool = getPool();

  // Validate and sanitize inputs
  const name = validateString(emp.name, { required: true, maxLength: 30 });
  if (!name) throw new Error("Name is required and must be 30 characters or less");

  const role = validateEnum(emp.role, ['Technician', 'Manager', 'Administrator'], 'Technician');
  const email = validateEmail(emp.email);
  if (email === null) throw new Error("Invalid email format");

  const phone = validatePhone(emp.phone);
  if (phone === null) throw new Error("Invalid phone format");

  const status = validateEnum(emp.status, ['Active', 'Inactive'], 'Active');
  const permissionLevel = validateEnum(emp.permissionLevel || emp.role, ['Technician', 'Manager', 'Administrator'], role);

  const [result] = await pool.query(
    `INSERT INTO employees (name, role, email, phone, status, permissionLevel)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, role, email, phone, status, permissionLevel]
  );

  return { id: result.insertId, name, role, email, phone, status, permissionLevel };
}

async function updateEmployee(id, emp) {
  const pool = getPool();

  // Validate and sanitize inputs
  const name = validateString(emp.name, { required: true, maxLength: 30 });
  if (!name) throw new Error("Name is required and must be 30 characters or less");

  const role = validateEnum(emp.role, ['Technician', 'Manager', 'Administrator'], 'Technician');
  const email = validateEmail(emp.email);
  if (email === null) throw new Error("Invalid email format");

  const phone = validatePhone(emp.phone);
  if (phone === null) throw new Error("Invalid phone format");

  const status = validateEnum(emp.status, ['Active', 'Inactive'], 'Active');
  const permissionLevel = validateEnum(emp.permissionLevel || emp.role, ['Technician', 'Manager', 'Administrator'], role);

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