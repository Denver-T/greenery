// apps/api/src/middleware/notFound.js

/**
 * Not Found Middleware
 * --------------------
 * Handles requests that do not match any defined route.
 *
 * Responsibilities:
 * - Catch all unmatched routes in the application
 * - Generate a standardized 404 error using the httpError utility
 * - Forward the error to the global error handler
 *
 * Why this exists:
 * Express does not automatically return structured 404 responses.
 * Without this middleware, unmatched routes would either hang or
 * return inconsistent responses depending on other middleware.
 *
 * IMPORTANT:
 * This middleware must be registered AFTER all routes
 * but BEFORE the global error handler in app.js.
 *
 * Example order in app.js:
 *
 *   app.use("/users", userRoutes);
 *   app.use("/tasks", taskRoutes);
 *
 *   app.use(notFound);
 *   app.use(errorHandler);
 */

const { httpError } = require("../utils/httpError");

module.exports = (req, res, next) => {
  /**
   * Create a standardized 404 error.
   * Including request context helps debugging and logging.
   */
  const error = httpError(
    404,
    `Route not found: ${req.method} ${req.originalUrl}`,
    "ROUTE_NOT_FOUND"
  );

  /**
   * Forward the error to the centralized error handler.
   * The global error middleware will format the final response.
   */
  return next(error);
};