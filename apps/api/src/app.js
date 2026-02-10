// apps/api/src/app.js
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const dbHealthRoutes = require("./routes/dbHealth");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRoutes);
app.use("/db-health", dbHealthRoutes);

// 404 + Error handler (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;