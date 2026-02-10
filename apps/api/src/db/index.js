// apps/api/src/db/index.js
const mysql = require("mysql2/promise");

let pool;

/**
 * Create (or return) a shared MySQL connection pool.
 * Uses environment variables defined in apps/api/.env
 */
async function getPool() {
  if (pool) return pool;

  const {
    DB_HOST = "localhost",
    DB_PORT = "3306",
    DB_NAME = "greenery",
    DB_USER = "greenery_user",
    DB_PASSWORD = "greenery_pass",
  } = process.env;

  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

/**
 * Run a SQL query with optional params.
 * Returns [rows, fields] from mysql2.
 */
async function query(sql, params = []) {
  const p = await getPool();
  return p.execute(sql, params);
}

module.exports = {
  getPool,
  query,
};