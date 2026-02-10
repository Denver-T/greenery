const mysql = require('mysql2/promise');
require('dotenv').config(); // Ensure variables are loaded

// Create the connect with database
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'greenery',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection when this file is loaded
pool.getConnection()
  .then(conn => {
    console.log('✅ Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;