// apps/api/src/utils/activityLogger.js
// Best-effort audit trail for privileged and destructive actions.

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
