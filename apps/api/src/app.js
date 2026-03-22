// apps/api/src/app.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("../config/swagger");

const healthRoutes = require("./routes/health");
const dbHealthRoutes = require("./routes/dbHealth");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const plantRoutes = require("./routes/plants");
const accountRoutes = require("./routes/accounts");
const employeeRoutes = require("./routes/employees");
const reqRoutes = require("./routes/reqs");
const scheduleRoutes = require("./routes/schedule"); 

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

/**
 * Core middleware
 */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/**
 * API routes
 */
app.use("/health", healthRoutes);
app.use("/db-health", dbHealthRoutes);
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/plants", plantRoutes);
app.use("/accounts", accountRoutes);
app.use("/employees", employeeRoutes);
app.use("/reqs", reqRoutes);
app.use("/schedule", scheduleRoutes); // ← ADD THIS

/**
 * API documentation
 */
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    swaggerOptions: { defaultModelsExpandDepth: -1 },
  }),
);

/**
 * Final middleware
 */
app.use(notFound);
app.use(errorHandler);

module.exports = app;