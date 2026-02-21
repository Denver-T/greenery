const express = require("express");
const cors = require("cors");
// apps/api/src/server.js
require("dotenv").config();

const app = require("./app");

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "ok",
//     service: "api",
//     timestamp: new Date().toISOString(),
//   });
// });


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});