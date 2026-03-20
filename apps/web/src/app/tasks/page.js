"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TasksPage() {
  const router = useRouter();
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [error, setError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);

  async function loadReqs() {
    setError("");
    setLoading(true);

    try {
      const data = await fetchApi("/reqs", {
        cache: "no-store",
      });
      setReqs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load work requests.");
    } finally {
      setLoading(false);
    }
  }

  async function openReqDetails(id) {
    setError("");
    setDetailsLoading(true);

    try {
      const data = await fetchApi(`/reqs/${id}`, {
        cache: "no-store",
      });
      setSelectedReq(data);
    } catch (err) {
      setError(err.message || "Failed to load request details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadReqs();
  }, []);

  async function deleteReq(id) {
    if (!confirm("Delete this REQ?")) {
      return;
    }

    try {
      await fetchApi(`/reqs/${id}`, {
        method: "DELETE",
      });

      if (selectedReq?.id === id) {
        setSelectedReq(null);
      }

      await loadReqs();
    } catch (err) {
      setError(err.message || "Failed to delete REQ.");
    }
  }

  return (
    <AppShell title="View Tasks">
      <div>
        <section className="app-panel shadow-soft mb-6 p-6">
          <h2 className="app-title mb-2 text-xl">
            Submitted Work Requests
          </h2>
          <p className="app-copy text-sm">
            This page shows submitted REQ forms from the database. You can review
            each one and later connect them to task creation.
          </p>
        </section>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-300/40 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="app-panel shadow-soft p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="app-title text-lg">
              Work Request Queue
            </h3>

            <button
              onClick={loadReqs}
              className="app-button app-button-primary px-4 py-2 text-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading requests...</p>
          ) : reqs.length === 0 ? (
            <p className="text-muted-foreground">No work requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-sm font-bold text-muted-foreground">
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Tech</th>
                    <th className="px-3 py-3">Account</th>
                    <th className="px-3 py-3">Action Required</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">View</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((req) => (
                    <tr key={req.id} className="border-b border-border text-sm text-foreground">
                      <td className="px-3 py-3">{req.referenceNumber}</td>
                      <td className="px-3 py-3">
                        {req.requestDate ? String(req.requestDate).slice(0, 10) : "-"}
                      </td>
                      <td className="px-3 py-3">{req.techName || "-"}</td>
                      <td className="px-3 py-3">{req.account || "-"}</td>
                      <td className="px-3 py-3">{req.actionRequired || "-"}</td>
                      <td className="px-3 py-3">{req.location || "-"}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => openReqDetails(req.id)}
                          className="app-button app-button-primary px-3 py-1.5 text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedReq && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
            onClick={() => setSelectedReq(null)}
          >
            <div
              className="app-panel shadow-elevated-lg max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="app-title text-xl">
                  Work Request Details
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/req?edit=${selectedReq.id}`)}
                    className="app-button app-button-primary px-4 py-2 text-sm"
                  >
                    Edit REQ
                  </button>
                  <button
                    onClick={() => deleteReq(selectedReq.id)}
                    className="app-button border border-red-300/50 bg-red-100/70 px-4 py-2 text-sm text-red-700 hover:bg-red-200/80 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  >
                    Delete REQ
                  </button>
                  <button
                    onClick={() => setSelectedReq(null)}
                    className="app-button app-button-secondary px-4 py-2 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>

              {detailsLoading ? (
                <p className="text-muted-foreground">Loading details...</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Info label="Reference Number" value={selectedReq.referenceNumber} />
                    <Info
                      label="Date"
                      value={selectedReq.requestDate ? String(selectedReq.requestDate).slice(0, 10) : "-"}
                    />
                    <Info label="Tech Name" value={selectedReq.techName} />
                    <Info label="Account" value={selectedReq.account} />
                    <Info label="Account Contact" value={selectedReq.accountContact} />
                    <Info label="Account Address" value={selectedReq.accountAddress} />
                    <Info label="Action Required" value={selectedReq.actionRequired} />
                    <Info label="Number of Plants" value={selectedReq.numberOfPlants} />
                    <Info label="Plant Wanted" value={selectedReq.plantWanted} />
                    <Info label="Plant Replaced" value={selectedReq.plantReplaced} />
                    <Info label="Plant Size" value={selectedReq.plantSize} />
                    <Info label="Plant Height" value={selectedReq.plantHeight} />
                    <Info label="Planter Type / Size" value={selectedReq.planterTypeSize} />
                    <Info label="Planter Colour" value={selectedReq.planterColour} />
                    <Info label="Staging Material" value={selectedReq.stagingMaterial} />
                    <Info label="Lighting" value={selectedReq.lighting} />
                    <Info label="Method" value={selectedReq.method} />
                    <Info label="Location" value={selectedReq.location} />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">
                      Notes
                    </label>
                    <div className="app-inset px-4 py-3 text-sm text-foreground">
                      {selectedReq.notes || "No notes provided."}
                    </div>
                  </div>

                  {selectedReq.picturePath ? (
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Uploaded Image
                      </label>
                      <img
                        src={`${API_BASE}${selectedReq.picturePath}`}
                        alt="REQ upload"
                        className="max-h-96 rounded-2xl border border-border object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-muted">
                      No image uploaded for this request.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="app-inset px-4 py-3">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  );
}
