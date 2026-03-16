// apps/api/src/controllers/userController.js

/**
 * User Controller
 * ---------------
 * Controllers are responsible for HTTP concerns only:
 * - Validate/normalize request inputs (params/body)
 * - Call the service layer for business logic / data access
 * - Return successful responses (never error responses directly)
 * - Forward all errors to the global error handler via `next(err)`
 *
 * Important conventions:
 * - Do NOT send error JSON from controllers (no `res.status(...).json({ error: ... })`)
 * - Use `httpError()` for predictable error codes + details
 * - Keep success response shapes consistent (this file returns `{ data: ... }`)
 */

const userService = require("../services/userService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

/**
 * GET /users
 * Returns a list of all users.
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Service layer is the single source of truth for data retrieval.
    const users = await userService.getUsers();

    // Success responses are allowed directly from controllers.
    return res.status(200).json({ data: users });
  } catch (err) {
    // Always forward to centralized error middleware for uniform formatting.
    return next(err);
  }
};

/**
 * GET /users/:id
 * Returns a single user by numeric ID.
 */
exports.getUserById = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) {
      return next(
        httpError(400, "Invalid user id", "VALIDATION_ERROR", [
          { field: "id", issue: "must be a positive integer" },
        ])
      );
    }

    const user = await userService.getUserById(id);

    if (!user) {
      return next(httpError(404, "User not found", "USER_NOT_FOUND"));
    }

    return res.status(200).json({ data: user });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /users
 * Creates a new user.
 *
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, role, email, phone } = req.body;

    if (!isNonEmptyString(name)) {
      return next(
        httpError(400, "Field 'name' is required", "VALIDATION_ERROR", [
          { field: "name", issue: "required" },
        ])
      );
    }

    // Password is referenced in the service call; validate it here to avoid surprises downstream.
    // if (!isNonEmptyString(password)) {
    //   return next(
    //     httpError(400, "Field 'password' is required", "VALIDATION_ERROR", [
    //       { field: "password", issue: "required" },
    //     ])
    //   );
    // }

    if (role !== undefined && !isNonEmptyString(role)) {
      return next(
        httpError(400, "Field 'role' must be a non-empty string", "VALIDATION_ERROR", [
          { field: "role", issue: "must be a non-empty string" },
        ])
      );
    }

    const created = await userService.createUser({ name, role, email, phone });
    res.status(201).json({ data: created });

    // 201 Created for successful resource creation.
    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
};