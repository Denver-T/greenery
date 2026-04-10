// apps/api/src/db/index.js
// Shared MySQL access layer used by controllers and services.
// The rest of the codebase depends on `db.query(...)` instead of creating pools ad hoc.

const mysql = require("mysql2");

// Fail-fast at module load if required DB env vars are missing or empty.
// Mirrors the pattern in apps/api/config/firebase.js so the API crashes
// immediately on misconfiguration instead of failing mid-request.
// DB_PORT is intentionally NOT required — getPool() defaults it to 3306.
const requiredDbEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

for (const key of requiredDbEnv) {
  if (!process.env[key] || process.env[key].trim() === "") {
    throw new Error(`Missing required database environment variable: ${key}`);
  }
}

let pool;

function getPool() {
  if (!pool) {
    // Lazily create the pool once so startup does not fail before the first DB-backed request.
    const rawPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
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
