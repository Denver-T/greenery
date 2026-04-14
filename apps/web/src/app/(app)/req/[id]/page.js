"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fetchApi } from "@/lib/api/api";
import Button from "@/components/Button";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import DeleteWorkRequestDialog from "@/components/DeleteWorkRequestDialog";
import ScheduleRequestDialog from "@/components/ScheduleRequestDialog";
import LinkedScheduleList from "@/components/LinkedScheduleList";

const EDITOR_LEVELS = new Set(["Manager", "Administrator", "SuperAdmin"]);
const DELETER_LEVELS = new Set(["Administrator", "SuperAdmin"]);

export default function WorkRequestDetailPage({ params }) {
  // Next.js 15+: params is a Promise, unwrap with React.use()
  const { id } = use(params);
  const router = useRouter();

  const [workReq, setWorkReq] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [unscheduling, setUnscheduling] = useState(null);
  // Schedule-section errors are kept separate from the page-level `error`
  // state. Page-level errors replace the entire detail view with
  // DetailErrorState, which is correct for "failed to load the work req"
  // but wrong for "failed to unschedule one event" — that should show
  // inline next to the schedule list without nuking the rest of the page.
  const [scheduleError, setScheduleError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi(`/reqs/${id}`);
      // GET /reqs/:id returns { data: row } — fetchApi already unwraps .data
      setWorkReq(response);
    } catch (err) {
      setError(err.message || "Failed to load this work request.");
      setWorkReq(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await fetchApi("/auth/me", { cache: "no-store" });
        if (active) setCurrentUser(me || null);
      } catch {
        if (active) setCurrentUser(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canEdit = EDITOR_LEVELS.has(currentUser?.permissionLevel);
  const canDelete = DELETER_LEVELS.has(currentUser?.permissionLevel);

  async function handleDelete() {
    await fetchApi(`/reqs/${id}`, { method: "DELETE" });
    router.push("/req/list");
  }

  // Open the dialog immediately, fire the /employees fetch in the background
  // on first open. The dialog renders "Unassigned" as the only option until
  // the fetch resolves, then React re-renders the select with the real list.
  // Previous implementation awaited the fetch before opening the dialog,
  // which created a visible ~200ms dead click on cold page loads.
  function openScheduleDialog() {
    setScheduleOpen(true);
    if (employees.length === 0) {
      (async () => {
        try {
          const list = await fetchApi("/employees");
          const rows = Array.isArray(list) ? list : list?.data || [];
          setEmployees(
            rows
              .filter((e) => e && e.id && e.name)
              .map((e) => ({ id: e.id, name: e.name })),
          );
        } catch {
          // Non-fatal — dialog stays open with just "Unassigned" if the fetch fails.
        }
      })();
    }
  }

  async function handleScheduled() {
    setScheduleOpen(false);
    setScheduleError("");
    await load();
  }

  async function handleUnschedule(eventId) {
    setUnscheduling(eventId);
    setScheduleError("");
    try {
      await fetchApi(`/reqs/${id}/schedule-events/${eventId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      // Inline, section-local error — do NOT touch the page-level `error`
      // state, which would replace the whole detail view with DetailErrorState.
      setScheduleError(err?.message || "Failed to unschedule this event.");
    } finally {
      setUnscheduling(null);
    }
  }

  return (
    <>
      <section className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link
              href="/req/list"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted hover:text-foreground"
            >
              ← Back to directory
            </Link>
            <h2 className="mt-3 truncate text-2xl font-black tracking-tight text-foreground">
              {workReq?.referenceNumber || (loading ? "Loading…" : "Work Request")}
            </h2>
            <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
              {workReq?.account
                ? `${workReq.account} · ${workReq.actionRequired || "No action captured"}`
                : "Full detail view — every field synced to Monday is shown below."}
            </p>
          </div>

          {workReq ? (
            <div className="flex shrink-0 flex-col items-end gap-3">
              <SyncStatusBadge
                mondayItemId={workReq.monday_item_id}
                mondaySyncedAt={workReq.monday_synced_at}
              />
              {canEdit || canDelete ? (
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <Button
                      href={`/req/${id}/edit`}
                      variant="secondary"
                      size="md"
                    >
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <DetailLoadingState />
      ) : error ? (
        <DetailErrorState message={error} onRetry={load} />
      ) : !workReq ? (
        <DetailNotFound />
      ) : (
        <>
          <DetailBody workReq={workReq} />
          <section className="mt-8 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
                    Linked Schedule
                  </h3>
                  {workReq.scheduleEvents && workReq.scheduleEvents.length > 0 ? (
                    <span className="theme-tag rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {workReq.scheduleEvents.length === 1
                        ? "1 event"
                        : `${workReq.scheduleEvents.length} events`}
                    </span>
                  ) : null}
                </div>
                <p className="theme-copy mt-1 text-sm">
                  When this work will happen on the calendar
                </p>
              </div>
              {canEdit ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openScheduleDialog}
                >
                  + Schedule this request
                </Button>
              ) : null}
            </div>
            {scheduleError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
              >
                {scheduleError}
              </p>
            ) : null}
            <LinkedScheduleList
              events={workReq.scheduleEvents || []}
              workReqStatus={workReq.status}
              onUnschedule={canEdit ? handleUnschedule : null}
              unscheduling={unscheduling}
            />
          </section>
        </>
      )}

      {deleteOpen && workReq ? (
        <DeleteWorkRequestDialog
          workReq={workReq}
          onConfirm={handleDelete}
          onClose={() => setDeleteOpen(false)}
        />
      ) : null}

      {scheduleOpen && workReq ? (
        <ScheduleRequestDialog
          workReq={workReq}
          employees={employees}
          onClose={() => setScheduleOpen(false)}
          onScheduled={handleScheduled}
        />
      ) : null}
    </>
  );
}

function DetailBody({ workReq }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <DetailSection title="Core Details">
          <DetailField label="Reference" value={workReq.referenceNumber} mono />
          <DetailField label="Request Date" value={formatDate(workReq.requestDate)} />
          <DetailField label="Tech Name" value={workReq.techName} />
          <DetailField label="Account" value={workReq.account} />
          <DetailField label="Account Contact" value={workReq.accountContact} />
          <DetailField
            label="Account Address"
            value={workReq.accountAddress}
            wide
          />
          <DetailField
            label="Action Required"
            value={workReq.actionRequired}
            wide
          />
        </DetailSection>

        <DetailSection title="Plant and Placement">
          <DetailField label="Number of Plants" value={workReq.numberOfPlants} />
          <DetailField label="Plant Wanted" value={workReq.plantWanted} />
          <DetailField label="Plant Replaced" value={workReq.plantReplaced} />
          <DetailField label="Plant Size" value={workReq.plantSize} />
          <DetailField label="Plant Height" value={workReq.plantHeight} />
          <DetailField label="Planter Type & Size" value={workReq.planterTypeSize} />
          <DetailField label="Planter Colour" value={workReq.planterColour} />
          <DetailField
            label="Staging Material"
            value={workReq.stagingMaterial}
            wide
          />
        </DetailSection>

        <DetailSection title="Execution Notes">
          <DetailField label="Lighting" value={workReq.lighting} />
          <DetailField label="Method" value={workReq.method} />
          <DetailField label="Location" value={workReq.location} />
          <DetailField label="Due Date" value={formatDate(workReq.dueDate)} />
          <DetailField label="Notes" value={workReq.notes} wide preserveNewlines />
        </DetailSection>
      </section>

      <aside className="space-y-6">
        <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
            Status
          </h3>
          <dl className="mt-4 space-y-3">
            <MetaRow label="Status" value={workReq.status || "—"} />
            <MetaRow
              label="Created"
              value={formatDateTime(workReq.created_at)}
            />
            <MetaRow
              label="Last updated"
              value={formatDateTime(workReq.updated_at)}
            />
            <MetaRow
              label="Assigned to employee"
              value={workReq.assignedTo ? `#${workReq.assignedTo}` : "—"}
            />
          </dl>
        </section>

        <section className="rounded-card border border-border-soft bg-surface-warm p-6">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
            Monday.com Sync
          </h3>
          <dl className="mt-4 space-y-3">
            <MetaRow
              label="Monday item ID"
              value={
                workReq.monday_item_id ? (
                  <span className="font-mono">{workReq.monday_item_id}</span>
                ) : (
                  "Not yet synced"
                )
              }
            />
            <MetaRow
              label="Last synced"
              value={
                workReq.monday_synced_at
                  ? formatDateTime(workReq.monday_synced_at)
                  : "Never"
              }
            />
          </dl>
          <p className="theme-copy mt-4 text-xs leading-5">
            Sync fires automatically on every create, update, and delete. If
            Monday is unreachable, the change is queued and retried every 30
            seconds with exponential backoff.
          </p>
        </section>

        {workReq.picturePath ? (
          <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
              Attachment
            </h3>
            <p className="theme-copy mt-2 text-xs">
              {workReq.picturePath}
            </p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="border-b border-border-soft pb-6 last:border-b-0 last:pb-0 [&:not(:first-child)]:pt-6">
      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
        {title}
      </h3>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        {children}
      </dl>
    </div>
  );
}

function DetailField({ label, value, wide = false, mono = false, preserveNewlines = false }) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-foreground ${mono ? "font-mono font-semibold" : ""} ${preserveNewlines ? "whitespace-pre-wrap" : ""}`}
      >
        {display}
      </dd>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function DetailLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-card border border-border-soft bg-surface p-6 shadow-soft"
    >
      <span className="sr-only">Loading work request…</span>
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-1/3 rounded bg-border-soft/60" />
        <div className="h-3 w-1/2 rounded bg-border-soft/40" />
        <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <div className="h-2 w-16 rounded bg-border-soft/60" />
              <div className="mt-2 h-4 w-32 rounded bg-border-soft/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger-border bg-danger-soft p-6"
    >
      <div className="text-lg font-black text-danger">
        Failed to load work request
      </div>
      <p className="mt-2 text-sm leading-6 text-danger">{message}</p>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="secondary" size="md" onClick={onRetry}>
          Retry
        </Button>
        <Button href="/req/list" variant="ghost" size="md">
          Back to directory
        </Button>
      </div>
    </div>
  );
}

function DetailNotFound() {
  return (
    <div className="rounded-card border border-dashed border-border-soft bg-surface-warm p-10 text-center">
      <div className="theme-title text-lg font-black">Request not found</div>
      <p className="theme-copy mt-2 text-sm leading-6">
        This work request may have been deleted. Return to the directory to
        see what&apos;s available.
      </p>
      <div className="mt-4 flex justify-center">
        <Button href="/req/list" variant="primary" size="md">
          Back to directory
        </Button>
      </div>
    </div>
  );
}
