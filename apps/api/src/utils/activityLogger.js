// apps/api/src/utils/activityLogger.js
//
// Best-effort audit trail for privileged and destructive actions.
//
// The logger is intentionally non-blocking:
// - the business action should succeed or fail on its own merits
// - audit logging should enrich governance visibility without becoming a single point of failure
// - metadata is stored as JSON so we can keep context for admin actions without schema churn

const db = require("../db");

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return JSON.stringify(metadata);
}

async function logActivity({
  req,
  action,
  targetType,
  targetId = null,
  metadata = null,
}) {
  try {
    await db.query(
      `INSERT INTO activity_logs (
        actor_employee_id,
        actor_email,
        actor_permission_level,
        action,
        target_type,
        target_id,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req?.user?.employeeId || null,
        req?.user?.email || null,
        req?.user?.permissionLevel || req?.user?.role || null,
        action,
        targetType,
        targetId,
        normalizeMetadata(metadata),
      ]
    );
  } catch (err) {
    // Audit logging should never take down the primary business action.
    console.error("activity log write failed:", err?.message || err);
  }
}

module.exports = {
  logActivity,
};
