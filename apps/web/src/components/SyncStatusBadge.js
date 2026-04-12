"use client";

/**
 * Reads Monday sync state from a work request row and renders one of four
 * badges. Pure display component — computes the state from the fields the
 * API returns on every GET /reqs response.
 *
 * States (priority order):
 * - Synced:          monday_item_id is set AND monday_synced_at is recent
 * - Queued:          queue_attempts provided and > 0 (optional — comes from
 *                    future /api/v1/monday/sync-status enrichment)
 * - Not synced yet:  monday_item_id is null (either pre-sync or sync never ran)
 * - Failed:          queue_attempts > 3 (dead-letter territory)
 *
 * Props:
 * - mondayItemId:     work_req.monday_item_id
 * - mondaySyncedAt:   work_req.monday_synced_at (ISO timestamp or null)
 * - queueAttempts:    optional, from sync-status endpoint
 * - size:             "sm" | "md" (default "md")
 */
export default function SyncStatusBadge({
  mondayItemId,
  mondaySyncedAt,
  queueAttempts,
  size = "md",
}) {
  const state = resolveState({ mondayItemId, mondaySyncedAt, queueAttempts });
  const { label, tone, srText } = STATES[state];

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.08em] ${sizeClasses} ${tone}`}
      role="status"
      aria-label={srText}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-current"
      />
      {label}
    </span>
  );
}

function resolveState({ mondayItemId, mondaySyncedAt, queueAttempts }) {
  if (typeof queueAttempts === "number" && queueAttempts > 3) {
    return "failed";
  }
  if (typeof queueAttempts === "number" && queueAttempts > 0) {
    return "queued";
  }
  if (mondayItemId && mondaySyncedAt) {
    return "synced";
  }
  return "not_synced";
}

const STATES = {
  synced: {
    label: "Synced",
    srText: "Synced to Monday",
    tone: "border-success/30 bg-success-soft text-success",
  },
  queued: {
    label: "Queued",
    srText: "Sync queued for retry",
    tone: "border-warning/30 bg-warning-soft text-warning",
  },
  failed: {
    label: "Failed",
    srText: "Sync failed — retries exhausted",
    tone: "border-danger-border bg-danger-soft text-danger",
  },
  not_synced: {
    label: "Not synced",
    srText: "Not yet synced to Monday",
    tone: "border-border-soft bg-surface-muted text-muted",
  },
};
