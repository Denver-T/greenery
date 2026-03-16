// apps/api/src/middleware/authMiddleware.js

const admin = require("../../config/firebase");
const { httpError } = require("../utils/httpError");

/**
 * Authentication Middleware
 * -------------------------
 * Verifies Firebase ID tokens from the Authorization header:
 *   Authorization: Bearer <token>
 *
 * On success:
 * - Attaches a normalized authenticated identity to req.user
 *
 * On failure:
 * - Forwards a standardized 401 error to the global error handler
 */

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        httpError(401, "Authentication token missing", "AUTH_TOKEN_MISSING")
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      return next(
        httpError(401, "Authentication token missing", "AUTH_TOKEN_MISSING")
      );
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email:
        typeof decoded.email === "string"
          ? decoded.email.trim().toLowerCase()
          : null,
      role:
        typeof decoded.role === "string"
          ? decoded.role.trim().toLowerCase()
          : null,
      claims: decoded,
    };

    return next();
  } catch (err) {
    console.error("verifyToken failed");
    console.error("code:", err?.code);
    console.error("message:", err?.message);

    return next(
      httpError(401, "Invalid authentication token", "AUTH_TOKEN_INVALID")
    );
  }
}

module.exports = {
  verifyToken,
};