// apps/api/src/middleware/errorHandler.js

/**
 * Global Error Handling Middleware
 * --------------------------------
 * Single exit point for *all* API errors.
 *
 * Goals:
 * - One consistent error response shape for every endpoint
 * - Central place to translate "internal" errors into "client-safe" messages
 * - Avoid leaking stack traces / driver messages to clients
 *
 * IMPORTANT:
 * Register this LAST in app.js (after routes + notFound):
 *   app.use(notFound);
 *   app.use(errorHandler);
 *
 * Expected error sources:
 * - `httpError()` (preferred for all app/controller/service errors)
 * - Third-party libs (MySQL/Firebase/etc.)
 * - Unexpected exceptions
 */

module.exports = (err, req, res, next) => {
  // Express requires 4 args for error middleware.
  // We intentionally do not call `next()` here because we are the terminal handler.
  // eslint-disable-next-line no-unused-vars
  void next;

  /**
   * Known infrastructure error codes.
   * Treat these as "service unavailable" rather than "bad request".
   */
  const dbErrorCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
  ]);

  const now = new Date().toISOString();

  /**
   * Special-case: database connectivity failures.
   * - 503 indicates a dependency is down/unreachable.
   * - Use a stable code so clients/tests can detect it reliably.
   */
  if (dbErrorCodes.has(err?.code)) {
    console.error("Database connection error:", err);

    return res.status(503).json({
      status: "error",
      code: "DATABASE_UNAVAILABLE",
      message:
        "Database service is unavailable. Ensure MySQL is running and environment variables are configured.",
      // Keep response payloads small but useful for debugging client-side.
      // If you later adopt `details`, ensure it's always an array.
      details: [],
      timestamp: now,
    });
  }

  /**
   * Standard application errors should be created using `httpError()`,
   * which attaches `statusCode`, `code`, and optional `details`.
   */
  const statusCode =
    Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
      ? err.statusCode
      : 500;

  /**
   * Observability:
   * - Log 5xx as errors (unexpected)
   * - Optionally log 4xx at a lower level in real apps (omitted here)
   */
  if (statusCode >= 500) {
    console.error("Unhandled server error:", err);
  }

  /**
   * Centralized, uniform error response.
   * This is the structure controllers should rely on by calling `next(httpError(...))`.
   */
  return res.status(statusCode).json({
    status: "error",
    code: err?.code || "INTERNAL_SERVER_ERROR",
    message: err?.message || "Internal Server Error",
    // Always provide `details` as an array to keep clients consistent.
    details: Array.isArray(err?.details) ? err.details : [],
    timestamp: now,
  });
};