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
      email: decoded.email ?? null,
      // keep role null until SV-13 / custom claims are implemented
      role: decoded.role ?? null,
      // optional: keep the whole token if you want
      // claims: decoded,
    };

    return next();
  } catch (err) {
    console.error("verifyToken failed:", err);
    return next(
      httpError(401, "Invalid authentication token", "AUTH_TOKEN_INVALID")
    );
  }
};