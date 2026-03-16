const express = require("express");
const cors = require("cors");
const path = require("path");

const healthRoutes = require("./routes/health");
const dbHealthRoutes = require("./routes/dbHealth");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const plantRoutes = require("./routes/plants");
const accountRoutes = require("./routes/accounts");
const employeeRoutes = require("./routes/employees");
const reqRoutes = require("./routes/reqs");

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
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/**
 * API routes
 * ----------
 * Each route module owns a specific domain.
 * Route files should remain thin and delegate work to controllers/services.
 */
app.use("/health", healthRoutes);      // Basic service health check
app.use("/db-health", dbHealthRoutes); // Database connectivity check
app.use("/auth", authRoutes);          // Authentication-related routes (SV-12)
app.use("/tasks", taskRoutes);         // Task domain
app.use("/plants", plantRoutes);       // Plant domain
app.use("/users", userRoutes);         // User domain
app.use("/employees", employeeRoutes); // Employee domain
app.use("/reqs", reqRoutes);           // Work Requests domain


// User
app.use("/users", userRoutes);

// Documents
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

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