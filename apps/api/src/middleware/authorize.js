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
const { getAccessRank, normalizeAccessLevel } = require("../utils/permissions");

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // `verifyToken` must populate `req.user` first; without it there is no identity to authorize.
    if (!req.user) {
      return next(
        httpError(401, "Authentication required", "AUTH_REQUIRED")
      );
    }

    const userLevel = normalizeAccessLevel(
      req.user.permissionLevel || req.user.role || ""
    );
    const userRank = getAccessRank(userLevel);
    const minAllowedRank = allowedRoles.reduce((lowest, role) => {
      const rank = getAccessRank(role);
      return rank < lowest ? rank : lowest;
    }, Infinity);

    // Authorization is hierarchical so higher-privilege users can access
    // lower-privilege routes without duplicating "superadmin" everywhere.
    if (!userRank || userRank < minAllowedRank) {
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
