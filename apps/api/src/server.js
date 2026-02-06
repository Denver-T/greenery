const express = require("express");
const cors = require("cors");
const mysql = require('mysql2/promise')
const dotenv = require("dotenv");

// apps/api/src/server.js
require("dotenv").config();

const app = require("./app");

const app = express();

// Create the connect with database
const database = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: 'travelexperts',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});

//Get User List
app.get("/packages",async (req, res) => {
  try {
    const [rows] = await database.query('SELECT * FROM packages');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query failed' });
  }
})

// test
app.get('/daryl',(req,res) => {
  res.status(200).json(
    {
      status: "ok",
      text: "Hello Daryl",
      timestamp: new Date().toLocaleDateString(),
    }
  );
})


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});