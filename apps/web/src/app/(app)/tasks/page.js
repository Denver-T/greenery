"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import Button from "@/components/Button";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import DeleteWorkRequestDialog from "@/components/DeleteWorkRequestDialog";
import { fetchApi } from "@/lib/api/api";

function toRestorePayload(req) {
  return {
    referenceNumber: req.referenceNumber || "",
    requestDate: req.requestDate ? String(req.requestDate).slice(0, 10) : "",
    techName: req.techName || "",
    account: req.account || "",
    accountContact: req.accountContact || "",
    accountAddress: req.accountAddress || "",
    actionRequired: req.actionRequired || "",
    numberOfPlants:
      req.numberOfPlants === null ||
      req.numberOfPlants === undefined ||
      req.numberOfPlants === ""
        ? null
        : Number(req.numberOfPlants),
    plantWanted: req.plantWanted || "",
    plantReplaced: req.plantReplaced || "",
    plantSize: req.plantSize || "",
    plantHeight: req.plantHeight || "",
    planterTypeSize: req.planterTypeSize || "",
    planterColour: req.planterColour || "",
    stagingMaterial: req.stagingMaterial || "",
    lighting: req.lighting || "",
    method: req.method || "",
    location: req.location || "",
    notes: req.notes || "",
    dueDate: req.dueDate ? String(req.dueDate).slice(0, 10) : "",
  };
}

function canFullyRestore(req) {
  return !req?.picturePath;
}

export default function TasksPage() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [activeTab, setActiveTab] = useState("queue");

  async function loadReqs() {
    setError("");
    setLoading(true);

    try {
      const data = await fetchApi("/reqs", { cache: "no-store" });
      setReqs(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError(err.message || "Failed to load work requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReqs();
  }, []);

  function askToDelete(req) {
    setDeleteCandidate(req);
  }

  async function deleteReq(req) {
    if (!req?.id) return;

    setDeletingId(req.id);
    setError("");
    try {
      // Fetch the full row so we can recreate it later (list endpoint doesn't
      // include every field). fetchApi already unwraps `.data`.
      const fullReq = await fetchApi(`/reqs/${req.id}`, { cache: "no-store" });
      const snapshot = fullReq || req;

      await fetchApi(`/reqs/${req.id}`, { method: "DELETE" });
      setRecentlyDeleted((current) =>
        [
          {
            ...snapshot,
            deletedAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 8),
      );

      await loadReqs();
    } catch (err) {
      setError(err.message || "Failed to delete work request.");
      throw err; // let the dialog show the error too
    } finally {
      setDeletingId(null);
      setDeleteCandidate(null);
    }
  }

  async function undoDelete(req) {
    setError("");
    setDeletingId(req.id);
    try {
      await fetchApi("/reqs", {
        method: "POST",
        body: toRestorePayload(req),
      });

      setRecentlyDeleted((current) =>
        current.filter((item) => item.id !== req.id),
      );
      await loadReqs();
      setActiveTab("queue");
    } catch (err) {
      setError(err.message || "Failed to restore deleted work request.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6">
      <WorkspaceHeader
        eyebrow="Request Workspace"
        title="Submitted Work Requests"
        description="Review live requests, open any to view or edit, and recover recent deletions when they can be restored faithfully."
        stats={[
          { label: "live requests", value: reqs.length },
          { label: "recent deletions", value: recentlyDeleted.length },
        ]}
      />

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <WorkspaceToolbar
          left={
            <>
              <div
                className="rounded-full bg-surface p-1 shadow-soft"
                role="tablist"
              >
                <button
                  onClick={() => setActiveTab("queue")}
                  role="tab"
                  aria-selected={activeTab === "queue"}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "queue"
                      ? "bg-surface text-foreground shadow-soft"
                      : "text-muted"
                  }`}
                >
                  Queue
                </button>
                <button
                  onClick={() => setActiveTab("recent")}
                  role="tab"
                  aria-selected={activeTab === "recent"}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "recent"
                      ? "bg-surface text-foreground shadow-soft"
                      : "text-muted"
                  }`}
                >
                  Recently Deleted
                </button>
              </div>
              <div className="text-sm text-muted">
                {activeTab === "queue"
                  ? "Open active requests."
                  : "Recreate a recently deleted request from its snapshot. A fresh reference number is assigned."}
              </div>
            </>
          }
          right={
            <>
              <Button variant="secondary" size="md" onClick={loadReqs}>
                Refresh
              </Button>
            </>
          }
        />

        {activeTab === "queue" && loading ? (
          <p className="text-muted">Loading requests...</p>
        ) : activeTab === "queue" && reqs.length === 0 ? (
          <p className="text-muted">No work requests found.</p>
        ) : null}

        {activeTab === "queue" && reqs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border-soft text-left text-sm font-bold text-foreground">
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Tech</th>
                  <th className="px-3 py-3">Account</th>
                  <th className="px-3 py-3">Action Required</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Sync</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-border-soft text-sm text-foreground"
                  >
                    <td className="px-3 py-3 font-mono font-semibold">
                      {req.referenceNumber}
                    </td>
                    <td className="px-3 py-3">
                      {req.requestDate
                        ? String(req.requestDate).slice(0, 10)
                        : "-"}
                    </td>
                    <td className="px-3 py-3">{req.techName || "-"}</td>
                    <td className="px-3 py-3">{req.account || "-"}</td>
                    <td className="px-3 py-3">{req.actionRequired || "-"}</td>
                    <td className="px-3 py-3">{req.location || "-"}</td>
                    <td className="px-3 py-3">
                      <SyncStatusBadge
                        mondayItemId={req.monday_item_id}
                        mondaySyncedAt={req.monday_synced_at}
                        size="sm"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/req/${req.id}`}
                          className="inline-flex items-center rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => askToDelete(req)}
                          disabled={deletingId === req.id}
                          className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          {deletingId === req.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "recent" ? (
          recentlyDeleted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-soft bg-surface-warm px-5 py-8 text-sm text-muted">
              Nothing has been deleted recently.
            </div>
          ) : (
            <div className="grid gap-3">
              {recentlyDeleted.map((req) => (
                <div
                  key={`${req.id}-${req.deletedAt}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-soft bg-surface-warm px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground">
                        #{req.referenceNumber || "Deleted"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {req.account || "Unknown account"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {req.actionRequired || "No action listed"} at{" "}
                      {req.location || "no location"}
                    </p>
                    {req.picturePath ? (
                      <p className="mt-1 text-xs text-warning">
                        Image-backed requests cannot be fully restored after
                        deletion.
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                      Deleted {new Date(req.deletedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => undoDelete(req)}
                    disabled={deletingId === req.id || !canFullyRestore(req)}
                  >
                    {deletingId === req.id
                      ? "Recreating..."
                      : canFullyRestore(req)
                        ? "Recreate from snapshot"
                        : "Cannot recreate"}
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : null}
      </section>

      {deleteCandidate ? (
        <DeleteWorkRequestDialog
          workReq={deleteCandidate}
          onConfirm={() => deleteReq(deleteCandidate)}
          onClose={() => setDeleteCandidate(null)}
        />
      ) : null}
    </div>
  );
}
