"use client";

import { memo } from "react";
import Link from "next/link";

import SyncStatusBadge from "@/components/SyncStatusBadge";

/**
 * Memoized row component for the work request list. Pure display —
 * receives a work_req object and renders ref #, account, action, status,
 * due date, and a sync-status badge. The whole row is a clickable Link.
 *
 * Kept simple on purpose: fewer props mean the memo comparison stays cheap
 * even when the parent re-renders on page change.
 */
function WorkRequestRow({ workReq }) {
  const {
    id,
    referenceNumber,
    account,
    actionRequired,
    status,
    dueDate,
    monday_item_id: mondayItemId,
    monday_synced_at: mondaySyncedAt,
  } = workReq;

  return (
    <Link
      href={`/req/${id}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-border-soft bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
          Reference
        </span>
        <span className="mt-1 font-mono text-sm font-semibold text-foreground">
          {referenceNumber || "—"}
        </span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {account || "Unknown account"}
        </div>
        <div className="mt-1 truncate text-sm text-muted">
          {actionRequired || "No action captured"}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <StatusPill status={status} />
          {dueDate ? (
            <span>
              Due <time dateTime={dueDate}>{formatDate(dueDate)}</time>
            </span>
          ) : (
            <span>No due date</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <SyncStatusBadge
          mondayItemId={mondayItemId}
          mondaySyncedAt={mondaySyncedAt}
          size="sm"
        />
        <span
          aria-hidden="true"
          className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-700"
        >
          →
        </span>
      </div>
    </Link>
  );
}

function StatusPill({ status }) {
  const key = (status || "unassigned").toLowerCase().replace(/\s+/g, "_");
  const tone = STATUS_TONES[key] || STATUS_TONES.unassigned;
  const label = STATUS_LABELS[key] || status || "Unassigned";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}
    >
      {label}
    </span>
  );
}

const STATUS_LABELS = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_TONES = {
  unassigned: "border-border-soft bg-surface-muted text-muted",
  assigned: "border-info/30 bg-info-soft text-info",
  in_progress: "border-warning/30 bg-warning-soft text-warning",
  completed: "border-success/30 bg-success-soft text-success",
  cancelled: "border-danger-border bg-danger-soft text-danger",
};

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

export default memo(WorkRequestRow);
