module.exports = (err, req, res, next) => {
  console.error(err);

  // Common MySQL connection error codes
  const dbErrorCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
  ]);

  if (dbErrorCodes.has(err.code)) {
    return res.status(503).json({
      error: {
        message:
          "Database is unavailable. Ensure MySQL is running and environment variables are configured.",
        code: err.code,
      },
    });
  }

  const status = err.statusCode || 500;

  res.status(status).json({
    error: {
      message: err.message || "Internal Server Error",
      code: err.code || "INTERNAL_ERROR",
    },
  });
};