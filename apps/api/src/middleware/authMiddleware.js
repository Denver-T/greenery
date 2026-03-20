// apps/api/src/middleware/authMiddleware.js

const admin = require("../../config/firebase");
const { httpError } = require("../utils/httpError");
const accountService = require("../services/accountService");

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();

  switch (normalized) {
    case "admin":
    case "administrator":
      return "admin";
    case "manager":
      return "manager";
    case "employee":
    case "technician":
      return "technician";
    default:
      return null;
  }
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function parseBootstrapAdminEmails() {
  return String(process.env.BOOTSTRAP_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

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

    const email =
      typeof decoded.email === "string"
        ? decoded.email.trim().toLowerCase()
        : null;

    if (!email) {
      return next(
        httpError(
          401,
          "Authenticated token is missing an email claim",
          "AUTH_INVALID_TOKEN"
        )
      );
    }

    const bootstrapAdminEmails = parseBootstrapAdminEmails();

    let account = await accountService.getAccountByEmail(email);

    if (!account && bootstrapAdminEmails.includes(email)) {
      account = await accountService.ensureBootstrapAdminAccount(
        email,
        decoded.name || decoded.email
      );
    }

    if (!account) {
      return next(
        httpError(
          403,
          "Your account is not authorized for this application",
          "AUTH_ACCOUNT_NOT_FOUND"
        )
      );
    }

    if (normalizeStatus(account.status) !== "active") {
      return next(
        httpError(
          403,
          "Your account is inactive",
          "AUTH_ACCOUNT_INACTIVE"
        )
      );
    }

    const role =
      normalizeRole(account.permissionLevel) ||
      normalizeRole(account.role) ||
      normalizeRole(decoded.role);

    if (!role) {
      return next(
        httpError(
          403,
          "Your account does not have a valid permission level",
          "AUTH_ROLE_INVALID"
        )
      );
    }

    req.user = {
      uid: decoded.uid,
      email,
      role,
      account,
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
