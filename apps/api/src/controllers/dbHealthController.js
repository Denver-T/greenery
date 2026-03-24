// apps/api/src/controllers/dbHealthController.js
const db = require("../db");

exports.dbHealthCheck = async (req, res, next) => {
  try {
    // Use the cheapest possible query so this endpoint measures connectivity, not business logic.
    const [rows] = await db.query("SELECT 1 AS ok");
    res.status(200).json({ status: "ok", db: rows?.[0]?.ok ?? 1 });
  } catch (err) {
    // Pass to centralized error handler
    next(err);
  }
};
