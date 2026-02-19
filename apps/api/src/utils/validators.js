/**
 * validators.js
 * -------------
 * Shared validation helpers.
 *
 * Why this exists:
 * - Keeps controllers thin
 * - Avoids duplicating validation logic
 * - Makes validation reusable across routes
 */

/**
 * Checks if a value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Converts value to positive integer.
 * Returns null if invalid.
 */
function toPositiveInt(value) {
  const n = Number(value);

  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }

  return n;
}

module.exports = {
  isNonEmptyString,
  toPositiveInt,
};