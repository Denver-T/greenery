const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

module.exports = app;