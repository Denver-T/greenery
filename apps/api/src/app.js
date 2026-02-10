const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRoutes);

// 404 handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;