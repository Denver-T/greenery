/**
 * httpError
 * ----------
 * Factory function for creating standardized HTTP errors.
 *
 * Why this exists:
 * - Keeps error creation consistent across controllers
 * - Avoids repeating statusCode + message logic everywhere
 * - Allows structured error responses (code + details)
 *
 * Usage:
 *   throw httpError(400, "Title is required");
 */

function httpError(statusCode, message, code = "VALIDATION_ERROR", details = []) {
  const err = new Error(message);

  // Custom properties attached to the Error object
  err.statusCode = statusCode; // HTTP status (400, 404, 500, etc.)
  err.code = code;             // Internal error classification
  err.details = details;       // Optional validation details array

  return err;
}

module.exports = { httpError };