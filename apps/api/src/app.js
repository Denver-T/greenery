// apps/api/src/app.js
// Express application composition root.
// This file wires infrastructure, route modules, and final middleware together.

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
const employeeRoutes = require("./routes/employees");
const reqRoutes = require("./routes/reqs");
const scheduleRoutes = require("./routes/schedule");
const superAdminRoutes = require("./routes/superadmin");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

/**
 * Core middleware
 * - `cors()` keeps local web/mobile development simple.
 * - `express.json()` enables JSON request parsing for the API surface.
 * - `/uploads` serves request images saved by the work-request flow.
 */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/**
 * API routes
 * Each router owns one resource or boundary:
 * - health/db-health: operational checks
 * - auth: token-backed identity endpoints
 * - employees/plants/reqs/tasks/schedule: business resources
 */
app.use("/health", healthRoutes);
app.use("/db-health", dbHealthRoutes);
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/plants", plantRoutes);
app.use("/employees", employeeRoutes);
app.use("/reqs", reqRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/superadmin", superAdminRoutes);

/**
 * API documentation
 * Swagger is mounted in-process so the docs always reflect the running server.
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
 * `notFound` must run after all routes, and `errorHandler` must be last.
 */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
