// apps/api/src/db/index.js
// Shared MySQL access layer used by controllers and services.
// The rest of the codebase depends on `db.query(...)` instead of creating pools ad hoc.

const mysql = require("mysql2");

let pool;

function getPool() {
  if (!pool) {
    // Lazily create the pool once so startup does not fail before the first DB-backed request.
    pool = mysql
      .createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
      .promise();
  }
  return pool;
}

// Thin wrapper that keeps the DB API stable across the codebase.
// `dbHealthController` and the service layer both depend on this signature.
async function query(sql, params = []) {
  const p = getPool();
  return p.query(sql, params);
}

module.exports = {
  query,
  // Exported for rare cases where direct pool access is useful.
  getPool,
};
