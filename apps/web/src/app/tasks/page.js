"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TasksPage() {
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

  return (
    <AppShell title="View Tasks">
      <div className="p-6">
        <section className="mb-6 rounded-card bg-white p-6 shadow-soft">
          <h2 className="mb-2 text-xl font-extrabold text-brand-700">
            Submitted Work Requests
          </h2>
          <p className="text-sm text-gray-600">
            This page shows submitted REQ forms from the database. You can review
            each one and later connect them to task creation.
          </p>
        </section>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-card bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-brand-700">
              Work Request Queue
            </h3>

            <button
              onClick={loadReqs}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading requests...</p>
          ) : reqs.length === 0 ? (
            <p className="text-gray-600">No work requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b text-left text-sm font-bold text-gray-700">
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
                    <tr key={req.id} className="border-b text-sm text-gray-800">
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
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
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
              className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-brand-700">
                  Work Request Details
                </h3>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>

              {detailsLoading ? (
                <p className="text-gray-600">Loading details...</p>
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
                      {selectedReq.notes || "No notes provided."}
                    </div>
                  </div>

                  {selectedReq.picturePath ? (
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Uploaded Image
                      </label>
                      <img
                        src={`${API_BASE}${selectedReq.picturePath}`}
                        alt="REQ upload"
                        className="max-h-96 rounded-xl border border-gray-200 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-gray-500">
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-800">{value || "-"}</div>
    </div>
  );
}
