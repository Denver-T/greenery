/**
 * Global Error Handling Middleware
 * ---------------------------------
 * Centralizes all error responses.
 *
 * Responsibilities:
 * - Detect database connection errors
 * - Normalize application errors
 * - Prevent leaking internal details in production
 *
 * Must be registered LAST in app.js
 */
module.exports = (err, req, res, next) => {
  void next; // Express requires 4 args for error middleware; intentionally unused

  console.error(err);

  /**
   * Database-related error codes
   * These indicate infrastructure-level failures.
   */
  const dbErrorCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
  ]);

  // Handle infrastructure failures (DB unavailable)
  if (dbErrorCodes.has(err.code)) {
    return res.status(503).json({
      error: {
        message:
          "Database is unavailable. Ensure MySQL is running and environment variables are configured.",
        code: err.code,
        details: [],
      },
    });
  }

  // Handle application-level errors
  const status = err.statusCode || 500;

  res.status(status).json({
    error: {
      message: err.message || "Internal Server Error",
      code: err.code || "INTERNAL_ERROR",
      details: err.details || [],
    },
  });
};