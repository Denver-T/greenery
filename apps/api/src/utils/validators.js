// apps/api/src/utils/validators.js

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

/**
 * Validates and sanitizes a string value.
 * @param {string} value - The value to validate
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum allowed length
 * @param {boolean} options.required - Whether the field is required
 * @param {RegExp} options.pattern - Regex pattern to match
 * @returns {string|null} - Sanitized value or null if invalid
 */
function validateString(value, options = {}) {
  const { maxLength, required = false, pattern } = options;

  if (required && !isNonEmptyString(value)) {
    return null;
  }

  if (!value) return value; // Allow null/undefined for optional fields

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    return null;
  }

  if (maxLength && trimmed.length > maxLength) {
    return null;
  }

  if (pattern && !pattern.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Validates email format.
 * @param {string} email - Email to validate
 * @returns {string|null} - Valid email or null
 */
function validateEmail(email) {
  if (!email) return email; // Allow null for optional

  // Comprehensive email regex that follows RFC 5322 standards
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:[.][a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return validateString(email, { maxLength: 255, pattern: emailRegex });
}

/**
 * Validates phone number (comprehensive formats).
 * @param {string} phone - Phone to validate
 * @returns {string|null} - Valid phone or null
 */
function validatePhone(phone) {
  if (!phone) return phone; // Allow null for optional

  // Comprehensive phone regex supporting multiple international formats
  // Supports: +1 (555) 555-5555, +44 20 7123 4567, (555) 555-5555, 555-555-5555, 5555555555
  const phoneRegex =
    /^[+]?[1-9][\d]{0,3}?[\s.-]?[(]?[\d]{1,4}[)]?[\s.-]?[\d]{1,4}[\s.-]?[\d]{1,4}[\s.-]?[\d]{0,4}$/;

  return validateString(phone, { maxLength: 50, pattern: phoneRegex });
}

/**
 * Validates enum values.
 * @param {string} value - Value to check
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} defaultValue - Default value if invalid
 * @returns {string} - Valid value or default
 */
function validateEnum(value, allowedValues, defaultValue) {
  if (allowedValues.includes(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * Validates URL format.
 * @param {string} url - URL to validate
 * @returns {string|null} - Valid URL or null
 */
function validateUrl(url) {
  if (!url) return url; // Allow null for optional

  const urlRegex =
    /^https?:\/\/(www[.])?[-a-zA-Z0-9@:%._+~#=]{1,256}[.][a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

  return validateString(url, { maxLength: 500, pattern: urlRegex });
}

/**
 * Validates password strength.
 * @param {string} password - Password to validate
 * @param {object} options - Password requirements
 * @returns {string|null} - Valid password or null
 */
function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false,
  } = options;

  if (!password || password.length < minLength) {
    return null;
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return null;
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return null;
  }

  if (requireNumbers && !/\d/.test(password)) {
    return null;
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return null;
  }

  return password;
}

module.exports = {
  isNonEmptyString,
  toPositiveInt,
  validateString,
  validateEmail,
  validatePhone,
  validateEnum,
  validateUrl,
  validatePassword,
};