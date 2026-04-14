"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { fetchApi } from "@/lib/api/api";
import Button from "@/components/Button";
import ScheduleRequestDialog from "@/components/ScheduleRequestDialog";

const PAGE_SIZE = 25;
const MANAGER_LEVELS = new Set(["Manager", "Administrator", "SuperAdmin"]);

/**
 * Unscheduled Requests inbox.
 *
 * Lists work requests that have no linked schedule_events row. Default view
 * hides anything older than 30 days (the API enforces the window via
 * filters.includeOlder=false). Manager+ only — technicians see a locked
 * empty state instead of fetching.
 */
export default function UnscheduledRequestsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [accountQuery, setAccountQuery] = useState("");
  const [debouncedAccount, setDebouncedAccount] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [includeOlder, setIncludeOlder] = useState(false);

  // Inline schedule dialog — track which row is being scheduled.
  // `scheduleTargetRef` is a synchronous mirror used as a rapid-click gate:
  // React state reads are stale within a single tick, so two back-to-back
  // button clicks in the same microtask would both see `scheduleTarget ===
  // null` and set the target to the second row. The ref catches that.
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const scheduleTargetRef = useRef(null);
  const [employees, setEmployees] = useState([]);

  // Monotonic request id — every loadPage invocation tags itself with the
  // next id and discards its own response if another loadPage has started
  // in the meantime. Prevents out-of-order fetch responses (rapid filter
  // toggles / keystrokes) from overwriting newer state with stale rows.
  const requestIdRef = useRef(0);

  // Resolve current user once for the role gate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchApi("/auth/me", { cache: "no-store" });
        if (!cancelled) setCurrentUser(me || null);
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isManagerPlus = MANAGER_LEVELS.has(currentUser?.permissionLevel);

  // Debounce the account search input — 300ms after the last keystroke.
  // Reset to page 1 at the same time as the debounced value updates so the
  // page change and the filter change land in the same render, avoiding a
  // double-fetch race.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedAccount(accountQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [accountQuery]);

  // Filter toggles reset page synchronously with the filter change so React
  // batches both state updates into one render. The previous implementation
  // did the reset in a post-commit effect, which caused one fetch with the
  // old page number + one fetch with page=1 for every filter toggle — a
  // race condition on out-of-order responses.
  function toggleAssignedOnly(next) {
    setAssignedOnly(next);
    setPage(1);
  }
  function toggleIncludeOlder(next) {
    setIncludeOlder(next);
    setPage(1);
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (debouncedAccount) params.set("account", debouncedAccount);
    if (assignedOnly) params.set("assignedToPresent", "true");
    if (includeOlder) params.set("includeOlder", "true");
    return params.toString();
  }, [page, debouncedAccount, assignedOnly, includeOlder]);

  const loadPage = useCallback(async () => {
    const myId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi(`/reqs/unscheduled?${queryString}`, {
        raw: true,
      });
      if (myId !== requestIdRef.current) return; // stale — drop
      setRows(response?.data || []);
      setTotalCount(response?.totalCount ?? 0);
    } catch (err) {
      if (myId !== requestIdRef.current) return; // stale — drop
      setError(err.message || "Failed to load unscheduled requests.");
      setRows([]);
      setTotalCount(0);
    } finally {
      if (myId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [queryString]);

  // Only fetch once auth is resolved AND the user is allowed
  useEffect(() => {
    if (!authReady) return;
    if (!isManagerPlus) {
      setLoading(false);
      return;
    }
    loadPage();
  }, [authReady, isManagerPlus, loadPage]);

  // Lazy-load employees the first time the schedule dialog opens.
  // Guarded by the sync ref so a rapid double-click can't swap targets
  // between the click and the commit.
  function openScheduleFor(row) {
    if (scheduleTargetRef.current) return;
    scheduleTargetRef.current = row;
    setScheduleTarget(row);
    if (employees.length === 0) {
      (async () => {
        try {
          const list = await fetchApi("/employees");
          const list2 = Array.isArray(list) ? list : list?.data || [];
          setEmployees(
            list2
              .filter((e) => e && e.id && e.name)
              .map((e) => ({ id: e.id, name: e.name })),
          );
        } catch {
          // Non-fatal — dialog still opens with just "Unassigned".
        }
      })();
    }
  }

  function closeSchedule() {
    scheduleTargetRef.current = null;
    setScheduleTarget(null);
  }

  function handleScheduled() {
    // Optimistic: drop the row from the list without a full reload.
    // If this was the last row on a non-first page, step back one page so
    // the user doesn't land on an empty "Page N of N-1".
    if (scheduleTarget) {
      const wasLastOnPage = rows.length === 1 && page > 1;
      setRows((prev) => prev.filter((r) => r.id !== scheduleTarget.id));
      setTotalCount((c) => Math.max(0, c - 1));
      if (wasLastOnPage) {
        setPage((p) => Math.max(1, p - 1));
      }
    }
    closeSchedule();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const filtersActive = !!debouncedAccount || assignedOnly || includeOlder;

  return (
    <>
      <section className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-foreground">
              Schedule
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground">
              Unscheduled Requests
            </h2>
            <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
              Work requests waiting to be placed on the calendar. Default view
              shows the last 30 days — toggle &ldquo;Show older&rdquo; to surface
              the full backlog.
            </p>
          </div>

          <Button href="/req/list" variant="ghost" size="md">
            Full directory
          </Button>
        </div>
      </section>

      {!authReady ? (
        <LoadingState />
      ) : !isManagerPlus ? (
        <LockedState />
      ) : (
        <>
          <FilterBar
            accountQuery={accountQuery}
            onAccountChange={setAccountQuery}
            assignedOnly={assignedOnly}
            onAssignedOnlyChange={toggleAssignedOnly}
            includeOlder={includeOlder}
            onIncludeOlderChange={toggleIncludeOlder}
            totalCount={totalCount}
          />

          <section className="mt-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} onRetry={loadPage} />
            ) : rows.length === 0 ? (
              <EmptyState
                filtersActive={filtersActive}
                onClearFilters={() => {
                  setAccountQuery("");
                  setAssignedOnly(false);
                  setIncludeOlder(false);
                }}
              />
            ) : (
              <>
                <ul className="divide-y divide-border-soft/60">
                  {rows.map((row) => (
                    <UnscheduledRow
                      key={row.id}
                      row={row}
                      onSchedule={() => openScheduleFor(row)}
                    />
                  ))}
                </ul>

                {totalPages > 1 ? (
                  <nav
                    className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4"
                    aria-label="Pagination"
                  >
                    <div className="theme-copy text-sm">
                      Page <span className="font-semibold">{page}</span> of{" "}
                      <span className="font-semibold">{totalPages}</span> ·{" "}
                      {totalCount} total
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!hasPrev || loading}
                      >
                        ← Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!hasNext || loading}
                      >
                        Next →
                      </Button>
                    </div>
                  </nav>
                ) : null}
              </>
            )}
          </section>
        </>
      )}

      {scheduleTarget ? (
        <ScheduleRequestDialog
          workReq={scheduleTarget}
          employees={employees}
          onClose={closeSchedule}
          onScheduled={handleScheduled}
        />
      ) : null}
    </>
  );
}

function FilterBar({
  accountQuery,
  onAccountChange,
  assignedOnly,
  onAssignedOnlyChange,
  includeOlder,
  onIncludeOlderChange,
  totalCount,
}) {
  return (
    <section className="theme-panel-muted rounded-card border border-border-soft p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          placeholder="Search by account…"
          value={accountQuery}
          onChange={(e) => onAccountChange(e.target.value)}
          className="w-full rounded-xl border border-border-soft bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted md:max-w-xs"
          aria-label="Search by account"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={assignedOnly}
              onChange={(e) => onAssignedOnlyChange(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong accent-brand-700 focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            Assigned only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeOlder}
              onChange={(e) => onIncludeOlderChange(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong accent-brand-700 focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            Show older
          </label>
          <div className="text-sm font-medium theme-copy">
            {totalCount} unscheduled
          </div>
        </div>
      </div>
    </section>
  );
}

function UnscheduledRow({ row, onSchedule }) {
  const rowLabel = row.referenceNumber || `work request ${row.id}`;
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <Link
            href={`/req/${row.id}`}
            className="font-mono text-sm font-semibold text-foreground hover:underline"
          >
            {row.referenceNumber}
          </Link>
          <span className="text-sm font-medium text-foreground">
            {row.account || "—"}
          </span>
        </div>
        <p className="theme-copy mt-1 line-clamp-2 text-sm">
          {row.actionRequired || "—"}
        </p>
        <div className="theme-copy mt-1 text-xs">
          {row.techName ? row.techName : <em>Unassigned</em>}
          {" · "}
          {formatShortDate(row.created_at)}
        </div>
      </div>
      <div className="shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={onSchedule}
          aria-label={`Schedule ${rowLabel}`}
        >
          Schedule →
        </Button>
      </div>
    </li>
  );
}

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-card border border-border-soft bg-surface p-6 shadow-soft"
    >
      <span className="sr-only">Loading unscheduled requests…</span>
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-border-soft bg-surface-muted p-4"
          >
            <div className="h-3 w-20 rounded bg-border-soft/60" />
            <div className="mt-3 h-4 w-3/4 rounded bg-border-soft/60" />
            <div className="mt-2 h-3 w-1/2 rounded bg-border-soft/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ filtersActive, onClearFilters }) {
  if (filtersActive) {
    return (
      <div className="rounded-2xl border border-dashed border-border-soft bg-surface-warm p-10 text-center">
        <div className="theme-title text-lg font-black">
          No requests match your filters
        </div>
        <p className="theme-copy mt-2 text-sm leading-6">
          Clear filters to see the full inbox.
        </p>
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="md" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-border-soft bg-surface-warm p-10 text-center">
      <div className="theme-title text-lg font-black">
        Nothing waiting to be scheduled
      </div>
      <p className="theme-copy mt-2 text-sm leading-6">
        Every recent work request has a calendar event.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger-border bg-danger-soft p-6 text-center"
    >
      <div className="text-lg font-black text-danger">
        Failed to load unscheduled requests
      </div>
      <p className="mt-2 text-sm leading-6 text-danger">{message}</p>
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" size="md" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

function LockedState() {
  return (
    <div className="rounded-card border border-dashed border-border-soft bg-surface-warm p-10 text-center">
      <div className="theme-title text-lg font-black">
        You don&rsquo;t have access to this view
      </div>
      <p className="theme-copy mt-2 text-sm leading-6">
        The Unscheduled Requests inbox is for managers and admins. Ask a
        manager if you need to see it.
      </p>
      <div className="mt-4 flex justify-center">
        <Button href="/req/list" variant="primary" size="md">
          Back to work requests
        </Button>
      </div>
    </div>
  );
}
