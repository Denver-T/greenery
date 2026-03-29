"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import { fetchApi } from "@/lib/api/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const emptyForm = {
  referenceNumber: "",
  requestDate: "",
  techName: "",
  account: "",
  accountContact: "",
  accountAddress: "",
  actionRequired: "",
  numberOfPlants: "",
  plantWanted: "",
  plantReplaced: "",
  plantSize: "",
  plantHeight: "",
  planterTypeSize: "",
  planterColour: "",
  stagingMaterial: "",
  lighting: "",
  method: "",
  location: "",
  notes: "",
  dueDate: "",
};

function toFormValues(req) {
  return {
    referenceNumber: req.referenceNumber || "",
    requestDate: req.requestDate ? String(req.requestDate).slice(0, 10) : "",
    techName: req.techName || "",
    account: req.account || "",
    accountContact: req.accountContact || "",
    accountAddress: req.accountAddress || "",
    actionRequired: req.actionRequired || "",
    numberOfPlants:
      req.numberOfPlants === null || req.numberOfPlants === undefined
        ? ""
        : String(req.numberOfPlants),
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
      req.numberOfPlants === null || req.numberOfPlants === undefined || req.numberOfPlants === ""
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
  const [selectedReq, setSelectedReq] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [activeTab, setActiveTab] = useState("queue");
  const [openReqId, setOpenReqId] = useState(null);

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

  async function openReqDetails(id) {
    setError("");
    setDetailsLoading(true);
    setEditMode(false);

    try {
      const data = await fetchApi(`/reqs/${id}`, { cache: "no-store" });
      const req = data?.data || data;
      setSelectedReq(req);
      setForm(toFormValues(req));
    } catch (err) {
      setError(err.message || "Failed to load request details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadReqs();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setOpenReqId(params.get("open"));
  }, []);

  useEffect(() => {
    if (!openReqId || selectedReq || loading) {
      return;
    }

    const reqExists = reqs.some((req) => String(req.id) === String(openReqId));
    if (reqExists) {
      openReqDetails(openReqId);
    }
  }, [openReqId, reqs, selectedReq, loading]);

  async function saveReq() {
    if (!selectedReq) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await fetchApi(`/reqs/${selectedReq.id}`, {
        method: "PUT",
        body: {
          ...form,
          numberOfPlants: form.numberOfPlants === "" ? null : Number(form.numberOfPlants),
        },
      });

      const updated = await fetchApi(`/reqs/${selectedReq.id}`, { cache: "no-store" });
      const req = updated?.data || updated;
      setSelectedReq(req);
      setForm(toFormValues(req));
      setEditMode(false);
      await loadReqs();
    } catch (err) {
      setError(err.message || "Failed to save work request.");
    } finally {
      setSaving(false);
    }
  }

  function askToDelete(req) {
    setDeleteCandidate(req);
  }

  async function deleteReq(req) {
    if (!req?.id) {
      return;
    }

    setDeletingId(req.id);
    setError("");
    try {
      const fullReq =
        selectedReq?.id === req.id
          ? selectedReq
          : await fetchApi(`/reqs/${req.id}`, { cache: "no-store" });
      const snapshot = fullReq?.data || fullReq || req;

      await fetchApi(`/reqs/${req.id}`, { method: "DELETE" });
      setRecentlyDeleted((current) => [
        {
          ...snapshot,
          deletedAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 8));

      if (selectedReq?.id === req.id) {
        setSelectedReq(null);
        setEditMode(false);
        setForm(emptyForm);
      }
      await loadReqs();
    } catch (err) {
      setError(err.message || "Failed to delete work request.");
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

      setRecentlyDeleted((current) => current.filter((item) => item.id !== req.id));
      await loadReqs();
      setActiveTab("queue");
    } catch (err) {
      setError(err.message || "Failed to restore deleted work request.");
    } finally {
      setDeletingId(null);
    }
  }

  function closeModal() {
    setSelectedReq(null);
    setEditMode(false);
    setForm(emptyForm);
  }

  return (
    <AppShell title="View Tasks">
      <div className="p-6">
        <WorkspaceHeader
          eyebrow="Request Workspace"
          title="Submitted Work Requests"
          description="Review live requests, edit details, and recover recent deletions when they can be restored faithfully."
          stats={[
            { label: "live requests", value: reqs.length },
            { label: "recent deletions", value: recentlyDeleted.length },
          ]}
        />

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
          <WorkspaceToolbar
            left={
              <>
                <div className="rounded-full bg-white p-1 shadow-soft">
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "queue"
                      ? "bg-white text-[#1f3427] shadow-soft"
                      : "text-gray-600"
                  }`}
                >
                  Queue
                </button>
                <button
                  onClick={() => setActiveTab("recent")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "recent"
                      ? "bg-white text-[#1f3427] shadow-soft"
                      : "text-gray-600"
                  }`}
                >
                    Recently Deleted
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {activeTab === "queue"
                    ? "Open active requests."
                    : "Recover recent deletions when no uploaded image was involved."}
                </div>
              </>
            }
            right={
              <>
              <button
                onClick={loadReqs}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Refresh
              </button>
              </>
            }
          />

          {activeTab === "queue" && loading ? (
            <p className="text-gray-600">Loading requests...</p>
          ) : activeTab === "queue" && reqs.length === 0 ? (
            <p className="text-gray-600">No work requests found.</p>
          ) : null}

          {activeTab === "queue" && reqs.length > 0 ? (
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
                    <th className="px-3 py-3">Actions</th>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => openReqDetails(req.id)}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                          >
                            View
                          </button>
                          <button
                            onClick={() => askToDelete(req)}
                            disabled={deletingId === req.id}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
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
              <div className="rounded-xl border border-dashed border-[#d5ddc8] bg-[#fffdf7] px-5 py-8 text-sm text-gray-600">
                Nothing has been deleted recently.
              </div>
            ) : (
              <div className="grid gap-3">
                {recentlyDeleted.map((req) => (
                  <div
                    key={`${req.id}-${req.deletedAt}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d5ddc8] bg-[#fffdf7] px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#f0ebde] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1f3427]">
                          #{req.referenceNumber || "Deleted"}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {req.account || "Unknown account"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {req.actionRequired || "No action listed"} at {req.location || "no location"}
                      </p>
                      {req.picturePath ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Image-backed requests cannot be fully restored after deletion.
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                        Deleted {new Date(req.deletedAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => undoDelete(req)}
                      disabled={deletingId === req.id || !canFullyRestore(req)}
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === req.id
                        ? "Restoring..."
                        : canFullyRestore(req)
                          ? "Undo Delete"
                          : "Cannot Restore"}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </section>

        {selectedReq && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={closeModal}>
            <div
              className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border-soft bg-[#fffdf7] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold text-[#1f3427]">Work Request Details</h3>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setForm(toFormValues(selectedReq));
                        }}
                        className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveReq}
                        disabled={saving}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditMode(true)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => askToDelete(selectedReq)}
                        disabled={deletingId === selectedReq.id}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {deletingId === selectedReq.id ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        onClick={closeModal}
                        className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>

              {detailsLoading ? (
                <p className="text-gray-600">Loading details...</p>
              ) : editMode ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Reference Number" value={form.referenceNumber} onChange={(value) => setForm({ ...form, referenceNumber: value })} />
                  <Field label="Date" type="date" value={form.requestDate} onChange={(value) => setForm({ ...form, requestDate: value })} />
                  <Field label="Tech Name" value={form.techName} onChange={(value) => setForm({ ...form, techName: value })} />
                  <Field label="Account" value={form.account} onChange={(value) => setForm({ ...form, account: value })} />
                  <Field label="Account Contact" value={form.accountContact} onChange={(value) => setForm({ ...form, accountContact: value })} />
                  <Field label="Account Address" value={form.accountAddress} onChange={(value) => setForm({ ...form, accountAddress: value })} />
                  <Field label="Action Required" value={form.actionRequired} onChange={(value) => setForm({ ...form, actionRequired: value })} />
                  <Field label="Number of Plants" type="number" value={form.numberOfPlants} onChange={(value) => setForm({ ...form, numberOfPlants: value })} />
                  <Field label="Plant Wanted" value={form.plantWanted} onChange={(value) => setForm({ ...form, plantWanted: value })} />
                  <Field label="Plant Replaced" value={form.plantReplaced} onChange={(value) => setForm({ ...form, plantReplaced: value })} />
                  <Field label="Plant Size" value={form.plantSize} onChange={(value) => setForm({ ...form, plantSize: value })} />
                  <Field label="Plant Height" value={form.plantHeight} onChange={(value) => setForm({ ...form, plantHeight: value })} />
                  <Field label="Planter Type / Size" value={form.planterTypeSize} onChange={(value) => setForm({ ...form, planterTypeSize: value })} />
                  <Field label="Planter Colour" value={form.planterColour} onChange={(value) => setForm({ ...form, planterColour: value })} />
                  <Field label="Staging Material" value={form.stagingMaterial} onChange={(value) => setForm({ ...form, stagingMaterial: value })} />
                  <Field label="Lighting" value={form.lighting} onChange={(value) => setForm({ ...form, lighting: value })} />
                  <Field label="Method" value={form.method} onChange={(value) => setForm({ ...form, method: value })} />
                  <Field label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
                  <Field label="Due Date" type="date" value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} />
                  <TextAreaField label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Info label="Reference Number" value={selectedReq.referenceNumber} />
                    <Info label="Date" value={selectedReq.requestDate ? String(selectedReq.requestDate).slice(0, 10) : "-"} />
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                    <div className="rounded-xl border border-border-soft bg-[#f8f4ea] px-4 py-3 text-sm text-gray-800">
                      {selectedReq.notes || "No notes provided."}
                    </div>
                  </div>

                  {selectedReq.picturePath ? (
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Uploaded Image</label>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${API_BASE}${selectedReq.picturePath}`}
                        alt="REQ upload"
                        className="max-h-96 rounded-xl border border-border-soft object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-gray-500">No image uploaded for this request.</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {deleteCandidate ? (
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-6"
            onClick={() => setDeleteCandidate(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-[#d5ddc8] bg-[#fffdf7] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700 w-fit">
                Confirm Deletion
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-[#1f3427]">
                Delete this work request?
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                You are about to remove work request{" "}
                <span className="font-semibold text-gray-800">
                  #{deleteCandidate.referenceNumber || deleteCandidate.id}
                </span>{" "}
                for{" "}
                <span className="font-semibold text-gray-800">
                  {deleteCandidate.account || "unknown account"}
                </span>.
                {deleteCandidate.picturePath
                  ? " This request includes an uploaded image, so deleting it cannot be fully undone."
                  : " It will move to the Recently Deleted tab so you can undo it if this was a mistake."}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteCandidate(null)}
                  className="rounded-xl border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteReq(deleteCandidate)}
                  disabled={deletingId === deleteCandidate.id}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingId === deleteCandidate.id ? "Deleting..." : "Delete Request"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-border-soft bg-[#f8f4ea] px-4 py-3">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value || "-"}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm text-gray-900"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <label className="grid gap-1 md:col-span-2">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm text-gray-900"
      />
    </label>
  );
}
