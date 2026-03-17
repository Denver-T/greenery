const db = require("../../config/db");

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
      email,
      phone,
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
      email,
      phone,
      created_at
    FROM employees
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [id]);
  return rows[0] || null;
}

async function getAccountByEmail(email) {
  const sql = `
    SELECT
      id,
      name,
      role,
      email,
      phone,
      created_at
    FROM employees
    WHERE email = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [email]);
  return rows[0] || null;
}

async function createAccount(accountData) {
  const { name, role, email, phone = null } = accountData;

  const sql = `
    INSERT INTO employees (
      name,
      role,
      email,
      phone
    )
    VALUES (?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [name, role, email, phone]);
  return getAccountById(result.insertId);
}

async function updateAccount(id, updates) {
  const { name, role, email, phone = null } = updates;

  const sql = `
    UPDATE employees
    SET
      name = ?,
      role = ?,
      email = ?,
      phone = ?
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [name, role, email, phone, id]);

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

module.exports = {
  getAccounts,
  getAccountById,
  getAccountByEmail,
  createAccount,
  updateAccount,
  deleteAccount,
};
