"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
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

  async function loadReqs() {
    setError("");
    setLoading(true);

    try {
      const data = await fetchApi("/reqs", { cache: "no-store" });
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
    setEditMode(false);

    try {
      const data = await fetchApi(`/reqs/${id}`, { cache: "no-store" });
      setSelectedReq(data);
      setForm(toFormValues(data));
    } catch (err) {
      setError(err.message || "Failed to load request details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadReqs();
  }, []);

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
      setSelectedReq(updated);
      setForm(toFormValues(updated));
      setEditMode(false);
      await loadReqs();
    } catch (err) {
      setError(err.message || "Failed to save work request.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReq(id) {
    if (!confirm("Delete this work request?")) {
      return;
    }

    setDeletingId(id);
    setError("");
    try {
      await fetchApi(`/reqs/${id}`, { method: "DELETE" });
      if (selectedReq?.id === id) {
        setSelectedReq(null);
        setEditMode(false);
        setForm(emptyForm);
      }
      await loadReqs();
    } catch (err) {
      setError(err.message || "Failed to delete work request.");
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
        <section className="mb-6 rounded-card bg-white p-6 shadow-soft">
          <h2 className="mb-2 text-xl font-extrabold text-brand-700">
            Submitted Work Requests
          </h2>
          <p className="text-sm text-gray-600">
            Review submitted REQs, edit details, or remove old requests.
          </p>
        </section>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-card bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-brand-700">Work Request Queue</h3>
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
                            onClick={() => deleteReq(req.id)}
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
          )}
        </section>

        {selectedReq && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={closeModal}>
            <div
              className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold text-brand-700">Work Request Details</h3>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setForm(toFormValues(selectedReq));
                        }}
                        className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveReq}
                        disabled={saving}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditMode(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteReq(selectedReq.id)}
                        disabled={deletingId === selectedReq.id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {deletingId === selectedReq.id ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        onClick={closeModal}
                        className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
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
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
                      {selectedReq.notes || "No notes provided."}
                    </div>
                  </div>

                  {selectedReq.picturePath ? (
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Uploaded Image</label>
                      <img
                        src={`${API_BASE}${selectedReq.picturePath}`}
                        alt="REQ upload"
                        className="max-h-96 rounded-xl border border-gray-200 object-contain"
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
      </div>
    </AppShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
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
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
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
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
      />
    </label>
  );
}
