// apps/api/src/utils/httpError.js

/**
 * httpError
 * ---------
 * Creates a standardized Error object that can be forwarded to the global
 * error-handling middleware for consistent API responses.
 *
 * Design goals:
 * - One consistent shape for all application errors (statusCode, code, details)
 * - Easy to use in controllers/services: `return next(httpError(...))`
 * - Safe defaults that encourage predictable client behavior
 *
 * Usage patterns:
 *   // In a controller (preferred: forward to error handler)
 *   return next(httpError(400, "Email is required", "VALIDATION_ERROR"));
 *
 *   // With details (useful for field validation)
 *   return next(httpError(400, "Invalid input", "VALIDATION_ERROR", [
 *     { field: "email", message: "Email is required" }
 *   ]));
 *
 * Notes:
 * - This utility intentionally does NOT send responses. It only creates errors.
 * - The global error middleware is responsible for formatting the final JSON.
 */

function httpError(
  statusCode,
  message,
  code = "VALIDATION_ERROR",
  details = []
) {
  const err = new Error(message);

  /**
   * HTTP status code to be used by the global error handler.
   * Defaulting is handled by the error middleware (500) if omitted.
   */
  err.statusCode = statusCode;

  /**
   * Internal error classification used by the client and for debugging.
   * Examples: AUTH_TOKEN_MISSING, AUTH_TOKEN_INVALID, ROUTE_NOT_FOUND
   */
  err.code = code;

  /**
   * Optional structured details (commonly validation errors).
   * Keep this an array for a predictable shape on the client.
   */
  err.details = Array.isArray(details) ? details : [details];

  /**
   * Mark as "operational" so logging/monitoring can distinguish
   * expected app errors (4xx) from programmer bugs (5xx).
   * (This is optional but common in production codebases.)
   */
  err.isOperational = true;

  return err;
}

module.exports = { httpError };