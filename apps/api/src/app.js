// apps/api/src/app.js

/**
 * Express Application Configuration
 * ---------------------------------
 * Responsible for:
 * - Initializing middleware
 * - Mounting route modules
 * - Registering global error handlers
 *
 * This file does NOT:
 * - Start the server (handled in server.js)
 * - Contain business logic
 * - Contain database logic
 */

const express = require("express");
const cors = require("cors");

// Route Modules
const healthRoutes = require("./routes/health");

const dbHealthRoutes = require("./routes/dbHealth");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const plantRoutes = require("./routes/plants");
const userRoutes = require("./routes/users");

// Global Middleware
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const userRoutes = require("./api/users/route");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger');


const app = express();

/**
 * Core Middleware
 * ---------------
 * cors() → Enables cross-origin requests (required for web/mobile frontend)
 * express.json() → Parses incoming JSON request bodies
 */
app.use(cors());
app.use(express.json());

/**
 * Route Mounting
 * --------------
 * Each route module handles a specific domain.
 * Routes should not contain business logic directly.
 */
app.use("/health", healthRoutes);      // Basic service health check
app.use("/db-health", dbHealthRoutes); // Database connectivity check
app.use("/auth", authRoutes);          // Authentication-related routes (SV-12)
app.use("/tasks", taskRoutes);         // Task domain
app.use("/plants", plantRoutes);       // Plant domain
app.use("/users", userRoutes);         // User domain

// User
app.use("/users", userRoutes);

// Documents
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// 404 handler
/**
 * Error Handling (Order Matters)
 * ------------------------------
 * notFound → Catches unmatched routes (404)
 * errorHandler → Centralized error formatting
 *
 * These MUST be the last middleware registered.
 */
app.use(notFound);
app.use(errorHandler);

module.exports = app;