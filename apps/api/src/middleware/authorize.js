/**
 * Authorization Middleware (RBAC)
 * --------------------------------
 * Enforces role-based access control.
 *
 * Usage:
 *   authorize("manager")
 *   authorize("manager", "administrator")
 *
 * Requires verifyToken middleware to run first.
 */

const { httpError } = require("../utils/httpError");

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        httpError(401, "Authentication required", "AUTH_REQUIRED")
      );
    }

    const userRole = (req.user.role || "").toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return next(
        httpError(
          403,
          "You do not have permission to access this resource",
          "AUTH_FORBIDDEN"
        )
      );
    }

    return next();
  };
};