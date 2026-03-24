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
    // `verifyToken` must populate `req.user` first; without it there is no identity to authorize.
    if (!req.user) {
      return next(
        httpError(401, "Authentication required", "AUTH_REQUIRED")
      );
    }

    const userRole = (req.user.role || "").toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    // Roles are compared case-insensitively because they may come from
    // Firebase claims while DB roles use a separate canonical format.
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
