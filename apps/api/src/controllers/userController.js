/**
 * User Controller
 * ---------------
 * Responsibilities:
 * - Validate request inputs (params/body)
 * - Call the service layer
 * - Return consistent API responses
 */

const userService = require("../services/userService");
const { httpError } = require("../utils/httpError");
const { isNonEmptyString, toPositiveInt } = require("../utils/validators");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
};

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

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, password, role } = req.body;

    if (!isNonEmptyString(name)) {
      return next(
        httpError(400, "Field 'name' is required", "VALIDATION_ERROR", [
          { field: "name", issue: "required" },
        ])
      );
    }

    // role optional for now; if present must be non-empty
    if (role !== undefined && !isNonEmptyString(role)) {
      return next(
        httpError(400, "Field 'role' must be a non-empty string", "VALIDATION_ERROR", [
          { field: "role", issue: "must be a non-empty string" },
        ])
      );
    }

    const created = await userService.createUser({ name, password });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};