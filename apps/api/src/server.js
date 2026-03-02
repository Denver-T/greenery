// apps/api/src/server.js
require("dotenv").config();

const cors = require("cors");
const express = require("express");

const app = require("./app"); // our existing express app

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Routes
const employeesRoutes = require("./routes/employees");
app.use("/api/employees", employeesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server on specified PORT or default to 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});