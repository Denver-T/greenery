const accountService = require("../services/accountService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

/**
 * Account Controller
 * ------------------
 * Handles HTTP concerns for account endpoints.
 *
 * Responsibilities:
 * - Validate and normalize request input
 * - Call the account service layer
 * - Return successful HTTP responses
 * - Forward all errors to centralized error middleware
 *
 * Controllers should not contain raw SQL.
 * Controllers should not manually shape database queries.
 */

const VALID_ROLES = ["technician", "employee", "manager", "admin", "administrator"];

function normalizeRole(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : value;

  switch (normalized) {
    case "employee":
    case "technician":
      return "technician";
    case "manager":
      return "manager";
    case "admin":
    case "administrator":
      return "admin";
    default:
      return normalized;
  }
}

/**
 * Normalize optional string input.
 * Converts undefined, null, or blank strings into null.
 * Trims valid string input.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Validate and normalize account payload for create/update operations.
 *
 * @param {object} body
 * @returns {{
 *   name: string,
 *   role: string,
 *   email: string|null,
 *   phone: string|null
 * }}
 */
function validateAndNormalizeAccountPayload(body) {
  const rawName = body?.name;
  const rawRole = body?.role;
  const rawEmail = body?.email;
  const rawPhone = body?.phone;

  const name = typeof rawName === "string" ? rawName.trim() : rawName;
  const role = normalizeRole(rawRole);
  const email = normalizeOptionalString(rawEmail)?.toLowerCase() || null;
  const phone = normalizeOptionalString(rawPhone);

  const details = [];

  if (!isNonEmptyString(name)) {
    details.push({ field: "name", issue: "required" });
  }

  if (!isNonEmptyString(role)) {
    details.push({ field: "role", issue: "required" });
  } else if (!VALID_ROLES.includes(role)) {
    details.push({
      field: "role",
      issue: "must be one of: employee, manager, admin",
    });
  }

  if (rawEmail !== undefined && rawEmail !== null && typeof rawEmail !== "string") {
    details.push({ field: "email", issue: "must be a string" });
  }

  if (rawPhone !== undefined && rawPhone !== null && typeof rawPhone !== "string") {
    details.push({ field: "phone", issue: "must be a string" });
  }

  if (details.length > 0) {
    throw httpError(400, "Invalid account payload", "VALIDATION_ERROR", details);
  }

  return {
    name,
    role,
    email,
    phone,
  };
}

/**
 * GET /accounts
 * Returns all accounts.
 */
async function getAccounts(req, res, next) {
  try {
    const accounts = await accountService.getAccounts();

    return res.status(200).json({
      data: accounts,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /accounts/:id
 * Returns one account by id.
 */
async function getAccountById(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid account id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const account = await accountService.getAccountById(id);

    if (!account) {
      return next(httpError(404, "Account not found", "ACCOUNT_NOT_FOUND"));
    }

    return res.status(200).json({
      data: account,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /accounts
 * Creates a new account.
 */
async function createAccount(req, res, next) {
  try {
    const payload = validateAndNormalizeAccountPayload(req.body);

    const existingAccount = payload.email
      ? await accountService.getAccountByEmail(payload.email)
      : null;

    if (existingAccount) {
      return next(
        httpError(409, "An account with that email already exists", "ACCOUNT_CONFLICT", [
          { field: "email", issue: "already in use" },
        ])
      );
    }

    const createdAccount = await accountService.createAccount(payload);

    return res.status(201).json({
      data: createdAccount,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /accounts/:id
 * Updates an existing account.
 */
async function updateAccount(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid account id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const payload = validateAndNormalizeAccountPayload(req.body);

    const existingAccount = await accountService.getAccountById(id);

    if (!existingAccount) {
      return next(httpError(404, "Account not found", "ACCOUNT_NOT_FOUND"));
    }

    if (payload.email) {
      const accountWithSameEmail = await accountService.getAccountByEmail(payload.email);

      if (accountWithSameEmail && accountWithSameEmail.id !== id) {
        return next(
          httpError(409, "An account with that email already exists", "ACCOUNT_CONFLICT", [
            { field: "email", issue: "already in use" },
          ])
        );
      }
    }

    const updatedAccount = await accountService.updateAccount(id, payload);

    return res.status(200).json({
      data: updatedAccount,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /accounts/:id
 * Deletes an account by id.
 */
async function deleteAccount(req, res, next) {
  try {
    const id = toPositiveInt(req.params.id);

    if (!id) {
      return next(
        httpError(400, "Invalid account id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const deleted = await accountService.deleteAccount(id);

    if (!deleted) {
      return next(httpError(404, "Account not found", "ACCOUNT_NOT_FOUND"));
    }

    return res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return next(httpError(401, "Authentication required", "AUTH_REQUIRED"));
    }

    const email =
      typeof req.user.email === "string" ? req.user.email.trim().toLowerCase() : null;

    if (!email) {
      return next(
        httpError(
          400,
          "Authenticated token is missing an email claim",
          "AUTH_INVALID_TOKEN",
          [{ field: "email", issue: "missing from authenticated token" }]
        )
      );
    }

    const account = await accountService.getAccountByEmail(email);

    if (!account) {
      return next(
        httpError(404, "Authenticated account not found", "ACCOUNT_NOT_FOUND")
      );
    }

    return res.status(200).json({
      data: account,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getMe
};
