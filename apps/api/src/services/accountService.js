const db = require("../../config/db");

/**
 * Account Service
 * ---------------
 * Handles all database access for accounts.
 *
 * Notes:
 * - This service only talks to the database.
 * - It does not know anything about Express req/res objects.
 * - Controllers should call this service and handle HTTP concerns.
 */

/**
 * Return all accounts.
 * Ordered by newest first so recent records show up first in admin tools.
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
    FROM accounts
    ORDER BY created_at DESC, id DESC
  `;

  const [rows] = await db.query(sql);
  return rows;
}

/**
 * Return one account by primary key.
 * @param {number} id
 * @returns {object|null}
 */
async function getAccountById(id) {
  const sql = `
    SELECT
      id,
      name,
      role,
      email,
      phone,
      created_at
    FROM accounts
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [id]);
  return rows[0] || null;
}

/**
 * Return one account by email.
 * Useful for auth-related lookups and duplicate checking.
 * @param {string} email
 * @returns {object|null}
 */
async function getAccountByEmail(email) {
  const sql = `
    SELECT
      id,
      name,
      role,
      email,
      phone,
      created_at
    FROM accounts
    WHERE email = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [email]);
  return rows[0] || null;
}

/**
 * Create a new account.
 * @param {object} accountData
 * @param {string} accountData.name
 * @param {string} accountData.role
 * @param {string} accountData.email
 * @param {string|null} [accountData.phone]
 * @returns {object}
 */
async function createAccount(accountData) {
  const { name, role, email, phone = null } = accountData;

  const sql = `
    INSERT INTO accounts (
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

/**
 * Update an existing account.
 * @param {number} id
 * @param {object} updates
 * @param {string} updates.name
 * @param {string} updates.role
 * @param {string} updates.email
 * @param {string|null} [updates.phone]
 * @returns {object|null}
 */
async function updateAccount(id, updates) {
  const { name, role, email, phone = null } = updates;

  const sql = `
    UPDATE accounts
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

/**
 * Delete an account by id.
 * Returns true if a row was deleted, otherwise false.
 * @param {number} id
 * @returns {boolean}
 */
async function deleteAccount(id) {
  const sql = `DELETE FROM accounts WHERE id = ?`;
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
