const db = require("../../config/db");

function toDbRole(value) {
  const normalized = String(value || "").trim().toLowerCase();

  switch (normalized) {
    case "admin":
    case "administrator":
      return "Administrator";
    case "manager":
      return "Manager";
    case "employee":
    case "technician":
    default:
      return "Technician";
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function buildDefaultNameFromEmail(email) {
  const localPart = (email || "").split("@")[0] || "User";

  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Account Service
 * ---------------
 * In the current repo state, authentication identity is backed by the
 * employees table even though some code still uses the word "account".
 */

async function getAccounts() {
  const sql = `
    SELECT
      id,
      name,
      role,
      permissionLevel,
      email,
      phone,
      status,
      created_at
    FROM employees
    ORDER BY created_at DESC, id DESC
  `;

  const [rows] = await db.query(sql);
  return rows;
}

async function getAccountById(id) {
  const sql = `
    SELECT
      id,
      name,
      role,
      permissionLevel,
      email,
      phone,
      status,
      created_at
    FROM employees
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [id]);
  return rows[0] || null;
}

async function getAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  const sql = `
    SELECT
      id,
      name,
      role,
      permissionLevel,
      email,
      phone,
      status,
      created_at
    FROM employees
    WHERE LOWER(email) = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [normalizedEmail]);
  return rows[0] || null;
}

async function createAccount(accountData) {
  const { name, role, email, phone = null } = accountData;
  const normalizedEmail = normalizeEmail(email);
  const dbRole = toDbRole(role);

  const sql = `
    INSERT INTO employees (
      name,
      role,
      permissionLevel,
      email,
      phone,
      status
    )
    VALUES (?, ?, ?, ?, ?, 'Active')
  `;

  const [result] = await db.query(sql, [name, dbRole, dbRole, normalizedEmail, phone]);
  return getAccountById(result.insertId);
}

async function updateAccount(id, updates) {
  const { name, role, email, phone = null } = updates;
  const normalizedEmail = normalizeEmail(email);
  const dbRole = toDbRole(role);

  const sql = `
    UPDATE employees
    SET
      name = ?,
      role = ?,
      permissionLevel = ?,
      email = ?,
      phone = ?
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [name, dbRole, dbRole, normalizedEmail, phone, id]);

  if (result.affectedRows === 0) {
    return null;
  }

  return getAccountById(id);
}

async function deleteAccount(id) {
  const sql = `DELETE FROM employees WHERE id = ?`;
  const [result] = await db.query(sql, [id]);

  return result.affectedRows > 0;
}

async function ensureBootstrapAdminAccount(email, name = null) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const existingAccount = await getAccountByEmail(normalizedEmail);

  if (existingAccount) {
    return existingAccount;
  }

  const sql = `
    INSERT INTO employees (
      name,
      role,
      permissionLevel,
      email,
      phone,
      status
    )
    VALUES (?, 'Administrator', 'Administrator', ?, NULL, 'Active')
  `;

  const displayName =
    typeof name === "string" && name.trim()
      ? name.trim()
      : buildDefaultNameFromEmail(normalizedEmail);

  const [result] = await db.query(sql, [displayName, normalizedEmail]);
  return getAccountById(result.insertId);
}

module.exports = {
  getAccounts,
  getAccountById,
  getAccountByEmail,
  createAccount,
  updateAccount,
  deleteAccount,
  ensureBootstrapAdminAccount,
};
