/**
 * Authentication Middleware
 * -------------------------
 * Verifies Firebase ID tokens from the Authorization header:
 *   Authorization: Bearer <token>
 *
 * On success:
 * - Attaches a normalized user object to req.user
 *
 * On failure:
 * - Forwards a standardized 401 error to the global error handler
 */

const admin = require("../config/firebase");
const { httpError } = require("../utils/httpError");

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Enforce Bearer token format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        httpError(401, "Authentication token missing", "AUTH_TOKEN_MISSING")
      );
    }

    // Extract token portion after "Bearer "
    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      return next(
        httpError(401, "Authentication token missing", "AUTH_TOKEN_MISSING")
      );
    }

    // Verify token with Firebase
    const decoded = await admin.auth().verifyIdToken(token);

    // Attach normalized user info to the request for downstream use
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      // role may not exist yet; default is fine until DB/claims are implemented
      role: decoded.role || "technician",
    };

    return next();
  } catch (err) {
    return next(
      httpError(401, "Invalid authentication token", "AUTH_TOKEN_INVALID")
    );
  }
};