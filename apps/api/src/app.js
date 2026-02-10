// apps/api/src/app.js
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const dbHealthRoutes = require("./routes/dbHealth");
const taskRoutes = require("./routes/tasks");
const plantRoutes = require("./routes/plants");
const userRoutes = require("./routes/users");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRoutes);
app.use("/db-health", dbHealthRoutes);

app.use("/tasks", taskRoutes);
app.use("/plants", plantRoutes);
app.use("/users", userRoutes);

// 404 + Error handler (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;