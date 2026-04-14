// apps/api/src/app.js
// Express application composition root.
// This file wires infrastructure, route modules, and final middleware together.

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
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
const analyticsRoutes = require("./routes/analytics");
const createMondayWebhookRouter = require("./routes/mondayWebhook");
const { webhookLimiter } = require("./middleware/rateLimiters");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

// CORS allowlist computed once at module load. Reads from CORS_ORIGINS env var
// (comma-separated). Defaults cover the local web (3000) and Expo dev (8082)
// origins. No wildcard escape hatch — production must set CORS_ORIGINS explicitly.
const corsOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:8082"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    // Attach statusCode and code so the global error handler returns 403 instead
    // of 500 and does NOT log the rejection as "Unhandled server error".
    const err = new Error("Origin not allowed by CORS");
    err.statusCode = 403;
    err.code = "CORS_ORIGIN_DENIED";
    return cb(err);
  },
};

const app = express();

/**
 * Core middleware
 * - `helmet()` sets baseline security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   and runs first so even CORS-rejected responses get protected.
 * - `cors(corsOptions)` enforces the allowlist defined above.
 * - `express.json()` enables JSON request parsing for the API surface.
 * - `/uploads` serves request images saved by the work-request flow.
 */
app.use(helmet());
app.use(cors(corsOptions));
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
app.use("/analytics", analyticsRoutes);

// Monday inbound webhook (Phase 4). URL-based secret auth — the secret lives
// in the path, so this router runs BEFORE notFound and logs NOTHING about the
// path to avoid leaking the secret into application logs. webhookLimiter is
// defense-in-depth against a leaked secret — bounds blast radius without
// throttling legitimate Monday bursts (300/min/IP).
app.use("/monday", webhookLimiter, createMondayWebhookRouter());

/**
 * API documentation
 * Swagger is mounted in-process so the docs always reflect the running server.
 *
 * Helmet's default `contentSecurityPolicy` (set by `app.use(helmet())` above)
 * blocks the inline scripts that swagger-ui-express ships in its HTML shell —
 * `script-src 'self'` rejects them and the page renders blank in real browsers.
 *
 * The naive fix `helmet({ contentSecurityPolicy: false })` does NOT work here
 * because by the time this per-route middleware runs, the global helmet has
 * already set the CSP header on the response. `helmet({...false})` only stops
 * the CSP module from running — it does not remove an existing header.
 *
 * The correct fix is to explicitly strip the CSP header on this subroute before
 * swaggerUi.serve runs. Every other helmet header (X-Frame-Options, HSTS,
 * X-Content-Type-Options, etc.) is left intact because nothing removes them.
 * This is a surgical opt-out for /api-docs only, not a global escape hatch.
 */
app.use(
  "/api-docs",
  (req, res, next) => {
    res.removeHeader("Content-Security-Policy");
    return next();
  },
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
