"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchApi } from "@/lib/api/api";
import Button from "@/components/Button";
import WorkRequestRow from "@/components/WorkRequestRow";

const PAGE_SIZE = 25;

export default function WorkRequestListPage() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPage = useCallback(async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi(
        `/reqs?page=${targetPage}&pageSize=${PAGE_SIZE}`,
        { raw: true },
      );
      setRows(response?.data || []);
      setTotalCount(response?.totalCount ?? 0);
    } catch (err) {
      setError(err.message || "Failed to load work requests.");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(page);
  }, [page, loadPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <section className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-foreground">
              Work Requests
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-foreground">
              Request Directory
            </h2>
            <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
              Every work request in the system, newest first. Click a row to
              open the detail view, edit, or delete it. Sync status is shown
              for each item.
            </p>
          </div>

          <Button href="/req" variant="primary" size="md">
            + New Request
          </Button>
        </div>
      </section>

      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadPage(page)} />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((row) => (
                <WorkRequestRow key={row.id} workReq={row} />
              ))}
            </div>

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
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading work requests…</span>
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
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border-soft bg-surface-warm p-10 text-center">
      <div className="theme-title text-lg font-black">No work requests yet</div>
      <p className="theme-copy mt-2 text-sm leading-6">
        Create your first request to see it here and on the Monday board.
      </p>
      <div className="mt-4 flex justify-center">
        <Button href="/req" variant="primary" size="md">
          + Create a request
        </Button>
      </div>
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
        Failed to load work requests
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
