"use client";

import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const FIELD_GROUPS = [
  { name: "referenceNumber", label: "Reference Number", required: true },
  { name: "requestDate", label: "Request Date", type: "date", required: true },
  { name: "dueDate", label: "Due Date", type: "date" },
  { name: "techName", label: "Tech Name", placeholder: "Magnus", required: true },
  { name: "account", label: "Account", placeholder: "Inter Pipeline", required: true },
  { name: "accountContact", label: "Account Contact", placeholder: "Georgia Blevins" },
  { name: "accountAddress", label: "Account Address", placeholder: "123 Sesame St." },
  { name: "actionRequired", label: "Action Required", placeholder: "Soil top up", span: 2 },
  { name: "numberOfPlants", label: "Number of Plants", type: "number", min: 0, placeholder: "4" },
  { name: "plantWanted", label: "Plant Wanted", placeholder: "Aglaonema" },
  { name: "plantReplaced", label: "Plant Replaced", placeholder: "Aglaonema" },
];

function buildInitialForm(referenceNumber, requestDate, dueDate = "") {
  return {
    referenceNumber,
    requestDate,
    dueDate,
    techName: "",
    account: "",
    accountContact: "",
    accountAddress: "",
    actionRequired: "",
    numberOfPlants: "",
    plantWanted: "",
    plantReplaced: "",
    plantSize: "3 Gal",
    plantHeight: "Shorter than 2 feet",
    planterTypeSize: "",
    planterColour: "",
    stagingMaterial: "",
    lighting: "Medium",
    method: "",
    location: "",
    notes: "",
  };
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

export default function ReqPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const dueDateParam = searchParams.get("dueDate") || "";

  const generatedRef = useMemo(() => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `REQ-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState(() => buildInitialForm(generatedRef, today, dueDateParam));
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(Boolean(editId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editId) {
      setForm(buildInitialForm(generatedRef, today, dueDateParam));
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchApi(`/reqs/${editId}`, { cache: "no-store" });
        if (cancelled) {
          return;
        }

        setForm({
          referenceNumber: data.referenceNumber || generatedRef,
          requestDate: toDateInputValue(data.requestDate) || today,
          dueDate: toDateInputValue(data.dueDate),
          techName: data.techName || "",
          account: data.account || "",
          accountContact: data.accountContact || "",
          accountAddress: data.accountAddress || "",
          actionRequired: data.actionRequired || "",
          numberOfPlants: data.numberOfPlants ?? "",
          plantWanted: data.plantWanted || "",
          plantReplaced: data.plantReplaced || "",
          plantSize: data.plantSize || "3 Gal",
          plantHeight: data.plantHeight || "Shorter than 2 feet",
          planterTypeSize: data.planterTypeSize || "",
          planterColour: data.planterColour || "",
          stagingMaterial: data.stagingMaterial || "",
          lighting: data.lighting || "Medium",
          method: data.method || "",
          location: data.location || "",
          notes: data.notes || "",
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load REQ.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dueDateParam, editId, generatedRef, today]);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      if (selectedFile) {
        formData.append("picture", selectedFile);
      }

      if (editId) {
        await fetchApi(`/reqs/${editId}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        await fetchApi("/reqs", {
          method: "POST",
          body: formData,
        });
      }

      router.push("/tasks");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={editId ? "Edit Work REQ" : "Create Work REQ"}>
      <section className="app-panel shadow-soft p-6">
        <div className="mb-6">
          <div className="app-badge mb-3">{editId ? "Edit REQ" : "REQ Form"}</div>
          <h2 className="app-title text-2xl">
            {editId ? "Update work request" : "Submit a work request"}
          </h2>
          <p className="app-copy mt-2 max-w-2xl text-sm">
            Capture site details, replacement notes, due date, and an optional photo so the team can review and assign the request.
          </p>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading REQ...</div>
        ) : (
          <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {FIELD_GROUPS.map((field) => (
                <label
                  key={field.name}
                  className={`grid gap-2 ${field.span === 2 ? "md:col-span-2" : ""}`}
                >
                  <span className="text-sm font-semibold text-muted-foreground">{field.label}</span>
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    min={field.min}
                    required={field.required}
                    value={form[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    className="app-field focus:app-field-focus"
                  />
                </label>
              ))}

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Plant Size</span>
                <select
                  name="plantSize"
                  className="app-field focus:app-field-focus"
                  value={form.plantSize}
                  onChange={(event) => updateField("plantSize", event.target.value)}
                >
                  <option>1 Gal</option>
                  <option>2 Gal</option>
                  <option>3 Gal</option>
                  <option>5 Gal</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Plant Height</span>
                <select
                  name="plantHeight"
                  className="app-field focus:app-field-focus"
                  value={form.plantHeight}
                  onChange={(event) => updateField("plantHeight", event.target.value)}
                >
                  <option>Shorter than 2 feet</option>
                  <option>2-4 feet</option>
                  <option>4-6 feet</option>
                  <option>Taller than 6 feet</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Planter Type and Size</span>
                <input
                  name="planterTypeSize"
                  value={form.planterTypeSize}
                  placeholder="Lechuza 40"
                  onChange={(event) => updateField("planterTypeSize", event.target.value)}
                  className="app-field focus:app-field-focus"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Planter Colour</span>
                <input
                  name="planterColour"
                  value={form.planterColour}
                  placeholder="White"
                  onChange={(event) => updateField("planterColour", event.target.value)}
                  className="app-field focus:app-field-focus"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-muted-foreground">Type and Colour of Staging Material</span>
                <input
                  name="stagingMaterial"
                  value={form.stagingMaterial}
                  placeholder="Grey Spanish Moss"
                  onChange={(event) => updateField("stagingMaterial", event.target.value)}
                  className="app-field focus:app-field-focus"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Lighting</span>
                <select
                  name="lighting"
                  className="app-field focus:app-field-focus"
                  value={form.lighting}
                  onChange={(event) => updateField("lighting", event.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Method</span>
                <input
                  name="method"
                  value={form.method}
                  placeholder="Use spade to insert soil"
                  onChange={(event) => updateField("method", event.target.value)}
                  className="app-field focus:app-field-focus"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Location</span>
                <input
                  name="location"
                  value={form.location}
                  placeholder="Lobby"
                  onChange={(event) => updateField("location", event.target.value)}
                  className="app-field focus:app-field-focus"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-muted-foreground">Notes</span>
                <textarea
                  name="notes"
                  rows={4}
                  value={form.notes}
                  placeholder="Bring key to get into building"
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="app-field focus:app-field-focus resize-y"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-muted-foreground">Picture Upload</span>
                <input
                  type="file"
                  name="picture"
                  accept="image/*"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="app-field file:mr-4 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand"
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-300/40 bg-red-100/70 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : editId ? "Update REQ" : "Submit REQ"}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="app-button app-button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </AppShell>
  );
}
