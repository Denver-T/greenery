// apps/api/src/middleware/rateLimiters.js

/**
 * Rate Limiting Middleware
 * ------------------------
 * Provides reusable limiters for sensitive routes like login and write endpoints.
 *
 * - Returns 429 with standardized API error format
 * - Configurable via environment variables
 */

const rateLimit = require("express-rate-limit");
const { httpError } = require("../utils/httpError");

// Env helpers (safe defaults)
const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const RATE_LIMIT_LOGIN_WINDOW_MS = toInt(
  process.env.RATE_LIMIT_LOGIN_WINDOW_MS,
  15 * 60 * 1000 // 15 minutes
);
const RATE_LIMIT_LOGIN_MAX = toInt(
  process.env.RATE_LIMIT_LOGIN_MAX,
  20 // 20 attempts per window per IP
);

const RATE_LIMIT_WRITE_WINDOW_MS = toInt(
  process.env.RATE_LIMIT_WRITE_WINDOW_MS,
  10 * 60 * 1000 // 10 minutes
);
const RATE_LIMIT_WRITE_MAX = toInt(
  process.env.RATE_LIMIT_WRITE_MAX,
  60 // 60 writes per window per IP
);

/**
 * Standardized handler for when rate limit is exceeded.
 */
const rateLimitHandler = (req, res, next) => {
  return next(
    httpError(
      429,
      "Too many requests, please try again later",
      "RATE_LIMIT_EXCEEDED"
    )
  );
};

// Login limiter (more strict)
const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_LOGIN_WINDOW_MS,
  max: RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Write limiter (less strict)
const writeLimiter = rateLimit({
  windowMs: RATE_LIMIT_WRITE_WINDOW_MS,
  max: RATE_LIMIT_WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  loginLimiter,
  writeLimiter,
};