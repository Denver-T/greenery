// apps/api/src/db/index.js
// Shared MySQL access layer used by controllers and services.
// The rest of the codebase depends on `db.query(...)` instead of creating pools ad hoc.

const mysql = require("mysql2");
const env = require("../lib/env");

let pool;

function getPool() {
  if (!pool) {
    // Lazily create the pool once so startup does not fail before the first DB-backed request.
    const rawPool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 100,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      connectTimeout: 10000,
    });

    rawPool.on("error", (err) => {
      console.error("MySQL pool error:", err);
    });

    pool = rawPool.promise();
  }
  return pool;
}

// Thin wrapper that keeps the DB API stable across the codebase.
// `dbHealthController` and the service layer both depend on this signature.
async function query(sql, params = []) {
  const p = getPool();
  return p.query(sql, params);
}

async function getConnection() {
  return getPool().getConnection();
}

module.exports = {
  query,
  // Exported for rare cases where direct pool access is useful.
  getPool,
  getConnection,
};
