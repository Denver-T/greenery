const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("../config/swagger");

const healthRoutes = require("./routes/health");
const dbHealthRoutes = require("./routes/dbHealth");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const plantRoutes = require("./routes/plants");
const accountRoutes = require("./routes/accounts");
const employeeRoutes = require("./routes/employees");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

/**
 * Express Application Configuration
 * ---------------------------------
 * Responsible for:
 * - Initializing global middleware
 * - Mounting route modules
 * - Registering Swagger documentation
 * - Registering final error handlers
 *
 * This file does NOT:
 * - Start the HTTP server
 * - Contain business logic
 * - Contain database logic
 */

/**
 * Core middleware
 * ---------------
 * cors()        -> Enables cross-origin requests for frontend clients
 * express.json() -> Parses incoming JSON request bodies
 */
app.use(cors());
app.use(express.json());

/**
 * API routes
 * ----------
 * Each route module owns a specific domain.
 * Route files should remain thin and delegate work to controllers/services.
 */
app.use("/health", healthRoutes);
app.use("/db-health", dbHealthRoutes);
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/plants", plantRoutes);
app.use("/accounts", accountRoutes);
app.use("/employees", employeeRoutes);

/**
 * API documentation
 * -----------------
 * Swagger UI exposes the current API contract for testing and team reference.
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * Final middleware
 * ----------------
 * These must be registered last.
 *
 * notFound     -> handles unmatched routes
 * errorHandler -> centralizes all thrown/forwarded errors
 */
app.use(notFound);
app.use(errorHandler);

module.exports = app;