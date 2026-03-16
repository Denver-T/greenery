const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || "greenery_user",
  password: process.env.DB_PASSWORD || "greenery_pass",
  database: process.env.DB_NAME || "greenery",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;