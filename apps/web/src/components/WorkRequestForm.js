"use client";

import { useEffect, useRef, useState } from "react";
import {
  getTodayDateInputValue,
  sanitizeObjectStrings,
} from "@/lib/inputSafety";
import Button from "@/components/Button";

const REQ_LIMITS = {
  referenceNumber: 100,
  techName: 120,
  account: 150,
  accountContact: 150,
  accountAddress: 255,
  actionRequired: 255,
  plantWanted: 150,
  plantReplaced: 150,
  planterTypeSize: 100,
  planterColour: 100,
  stagingMaterial: 150,
  method: 100,
  location: 150,
  notes: 2000,
};

const EMPTY_INITIAL = {};

// Shared select styling — native browser arrow is hidden and replaced with a
// custom chevron so text can be truncated cleanly on narrow columns.
// `truncate` + `appearance-none` + `pr-10` reserves room so long option labels
// (e.g. "Shorter than 2 feet") get an ellipsis instead of overlapping the arrow.
const SELECT_CLASS =
  "w-full truncate appearance-none rounded-xl border border-border-soft bg-white py-2.5 pl-3 pr-10 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40";
const SELECT_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='1 1 6 6 11 1'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.875rem center",
  backgroundSize: "12px 8px",
};

/**
 * Shared work request form used by both the create page and the edit page.
 *
 * Props:
 * - mode: "create" | "edit"
 * - initialValues: object with existing work_req fields (required for edit,
 *   optional for create — create uses defaults)
 * - currentEmployeeName: only used in create mode to prefill techName from
 *   the signed-in employee
 * - onSubmit: async (cleanedPayloadFormData) => void. Parent performs the
 *   API call (POST or PUT) and handles navigation on success. If it throws,
 *   the error message is displayed inline.
 * - onCancel: () => void. Parent decides where to navigate on cancel. Form
 *   handles the dirty-confirm prompt before calling.
 * - submitLabel: button label (e.g. "Submit REQ" or "Save Changes")
 *
 * Uncontrolled (FormData-based) — fields use defaultValue so initialValues
 * populate naturally without per-field state management.
 */
export default function WorkRequestForm({
  mode,
  initialValues = EMPTY_INITIAL,
  currentEmployeeName = "",
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const accountAddressRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formDirty, setFormDirty] = useState(false);

  const today = getTodayDateInputValue();
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Warn on browser close/refresh/external nav if the form has unsaved edits.
  // In-app navigation via Cancel button is handled separately.
  useEffect(() => {
    if (!formDirty) return undefined;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [formDirty]);

  // Google Places autocomplete on the account address input.
  // Only activates when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.
  useEffect(() => {
    if (
      !mapsApiKey ||
      !accountAddressRef.current ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    let autocomplete = null;
    let listener = null;

    function attachAutocomplete() {
      if (!window.google?.maps?.places || !accountAddressRef.current) return;

      autocomplete = new window.google.maps.places.Autocomplete(
        accountAddressRef.current,
        { fields: ["formatted_address"], types: ["address"] },
      );

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place?.formatted_address && accountAddressRef.current) {
          accountAddressRef.current.value = place.formatted_address;
          setFormDirty(true);
        }
      });
    }

    if (window.google?.maps?.places) {
      attachAutocomplete();
    } else {
      const existingScript = document.getElementById(
        "google-maps-places-script",
      );

      if (existingScript) {
        existingScript.addEventListener("load", attachAutocomplete, {
          once: true,
        });
      } else {
        const script = document.createElement("script");
        script.id = "google-maps-places-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", attachAutocomplete, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      if (listener) {
        window.google?.maps?.event?.removeListener(listener);
      }
    };
  }, [mapsApiKey]);

  function handleCancel() {
    if (
      formDirty &&
      !window.confirm(
        "Discard this work request? Any unsaved changes will be lost.",
      )
    ) {
      return;
    }
    onCancel?.();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const fd = new FormData(e.currentTarget);

      // In create mode, techName is pulled from the signed-in user.
      // In edit mode, the form field carries the existing techName.
      if (mode === "create" && !currentEmployeeName) {
        throw new Error(
          "Your employee account could not be resolved. Please sign in again.",
        );
      }

      const techNameForSubmit =
        mode === "create" ? currentEmployeeName : fd.get("techName");

      const cleaned = sanitizeObjectStrings(
        {
          techName: techNameForSubmit,
          account: fd.get("account"),
          accountContact: fd.get("accountContact"),
          accountAddress: fd.get("accountAddress"),
          actionRequired: fd.get("actionRequired"),
          plantWanted: fd.get("plantWanted"),
          plantReplaced: fd.get("plantReplaced"),
          planterTypeSize: fd.get("planterTypeSize"),
          planterColour: fd.get("planterColour"),
          stagingMaterial: fd.get("stagingMaterial"),
          method: fd.get("method"),
          location: fd.get("location"),
          notes: fd.get("notes"),
        },
        {
          techName: { maxLength: REQ_LIMITS.techName },
          account: { maxLength: REQ_LIMITS.account },
          accountContact: { maxLength: REQ_LIMITS.accountContact },
          accountAddress: { maxLength: REQ_LIMITS.accountAddress },
          actionRequired: { maxLength: REQ_LIMITS.actionRequired },
          plantWanted: { maxLength: REQ_LIMITS.plantWanted },
          plantReplaced: { maxLength: REQ_LIMITS.plantReplaced },
          planterTypeSize: { maxLength: REQ_LIMITS.planterTypeSize },
          planterColour: { maxLength: REQ_LIMITS.planterColour },
          stagingMaterial: { maxLength: REQ_LIMITS.stagingMaterial },
          method: { maxLength: REQ_LIMITS.method },
          location: { maxLength: REQ_LIMITS.location },
          notes: { maxLength: REQ_LIMITS.notes, preserveNewlines: true },
        },
      );

      if (!cleaned.account) {
        throw new Error("Account is required.");
      }
      if (!cleaned.actionRequired) {
        throw new Error("Action Required is required.");
      }

      // Write cleaned values back into the FormData so the file upload path
      // (multipart POST) still works for create mode.
      Object.entries(cleaned).forEach(([key, value]) => fd.set(key, value));

      // Clear dirty flag BEFORE calling onSubmit so if parent navigates away
      // the beforeunload listener doesn't fire.
      setFormDirty(false);

      await onSubmit(fd, cleaned);
    } catch (err) {
      // Re-arm dirty flag if submit failed so leaving still warns
      setFormDirty(true);
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      onInput={() => {
        if (!formDirty) setFormDirty(true);
      }}
      encType="multipart/form-data"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <FormSection
            title="Core Details"
            description="Identify the request, the submitter, and the account."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {mode === "edit" ? (
                <Field label="Reference Number">
                  <input
                    name="referenceNumberDisplay"
                    defaultValue={initialValues.referenceNumber || ""}
                    readOnly
                    className="rounded-xl border border-border-soft bg-surface-muted px-3 py-2.5 text-foreground outline-none"
                  />
                  <span className="theme-copy mt-1 text-xs">
                    Assigned at creation — cannot be changed.
                  </span>
                </Field>
              ) : null}
              <Field label="Date" required>
                <input
                  type="date"
                  name="requestDate"
                  defaultValue={
                    initialValues.requestDate
                      ? String(initialValues.requestDate).slice(0, 10)
                      : today
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40"
                  required
                />
              </Field>
              <Field label="Tech Name" required>
                <input
                  name="techName"
                  defaultValue={
                    mode === "edit"
                      ? initialValues.techName || ""
                      : currentEmployeeName
                  }
                  placeholder="Magnus"
                  readOnly={mode === "create"}
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                  required
                />
              </Field>
              <Field label="Account" required>
                <input
                  name="account"
                  defaultValue={initialValues.account || ""}
                  maxLength={REQ_LIMITS.account}
                  placeholder="Inter Pipeline"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                  required
                />
              </Field>
              <Field label="Account Contact">
                <input
                  name="accountContact"
                  defaultValue={initialValues.accountContact || ""}
                  maxLength={REQ_LIMITS.accountContact}
                  placeholder="Georgia Blevins"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Account Address">
                <input
                  ref={accountAddressRef}
                  name="accountAddress"
                  defaultValue={initialValues.accountAddress || ""}
                  maxLength={REQ_LIMITS.accountAddress}
                  placeholder="123 Sesame St."
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Action Required" required className="md:col-span-2">
                <input
                  name="actionRequired"
                  defaultValue={initialValues.actionRequired || ""}
                  maxLength={REQ_LIMITS.actionRequired}
                  placeholder="Soil top up"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Plant and Placement"
            description="Use this section for swaps, installs, staging, or location notes."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Number of Plants">
                <input
                  type="number"
                  min="0"
                  name="numberOfPlants"
                  defaultValue={
                    initialValues.numberOfPlants !== undefined &&
                    initialValues.numberOfPlants !== null
                      ? String(initialValues.numberOfPlants)
                      : ""
                  }
                  placeholder="4"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Plant Wanted">
                <input
                  name="plantWanted"
                  defaultValue={initialValues.plantWanted || ""}
                  placeholder="Aglaonema"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Plant Replaced">
                <input
                  name="plantReplaced"
                  defaultValue={initialValues.plantReplaced || ""}
                  placeholder="Aglaonema"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Plant Size">
                <select
                  name="plantSize"
                  defaultValue={
                    mode === "edit"
                      ? initialValues.plantSize || ""
                      : initialValues.plantSize || "3 Gal"
                  }
                  className={SELECT_CLASS}
                  style={SELECT_STYLE}
                >
                  {mode === "edit" && !initialValues.plantSize ? (
                    <option value="">— not set —</option>
                  ) : null}
                  <option>1 Gal</option>
                  <option>2 Gal</option>
                  <option>3 Gal</option>
                  <option>5 Gal</option>
                </select>
              </Field>
              <Field label="Plant Height">
                <select
                  name="plantHeight"
                  defaultValue={
                    mode === "edit"
                      ? initialValues.plantHeight || ""
                      : initialValues.plantHeight || "Shorter than 2 feet"
                  }
                  className={SELECT_CLASS}
                  style={SELECT_STYLE}
                >
                  {mode === "edit" && !initialValues.plantHeight ? (
                    <option value="">— not set —</option>
                  ) : null}
                  <option>Shorter than 2 feet</option>
                  <option>2-4 feet</option>
                  <option>4-6 feet</option>
                  <option>Taller than 6 feet</option>
                </select>
              </Field>
              <Field label="Planter Type and Size">
                <input
                  name="planterTypeSize"
                  defaultValue={initialValues.planterTypeSize || ""}
                  placeholder="Lechuza 40"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Planter Colour">
                <input
                  name="planterColour"
                  defaultValue={initialValues.planterColour || ""}
                  placeholder="White"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Staging Material" className="md:col-span-2">
                <input
                  name="stagingMaterial"
                  defaultValue={initialValues.stagingMaterial || ""}
                  placeholder="Grey Spanish Moss"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection
            title="Execution Notes"
            description="Capture site instructions the field team needs to execute the request."
          >
            <div className="grid grid-cols-1 gap-4">
              <Field label="Lighting">
                <select
                  name="lighting"
                  defaultValue={
                    mode === "edit"
                      ? initialValues.lighting || ""
                      : initialValues.lighting || "Medium"
                  }
                  className={SELECT_CLASS}
                  style={SELECT_STYLE}
                >
                  {mode === "edit" && !initialValues.lighting ? (
                    <option value="">— not set —</option>
                  ) : null}
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </Field>
              <Field label="Method">
                <input
                  name="method"
                  defaultValue={initialValues.method || ""}
                  placeholder="Use spade to insert soil"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Location">
                <input
                  name="location"
                  defaultValue={initialValues.location || ""}
                  placeholder="Lobby"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={
                    initialValues.dueDate
                      ? String(initialValues.dueDate).slice(0, 10)
                      : ""
                  }
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40"
                />
              </Field>
              <Field label="Notes">
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={initialValues.notes || ""}
                  placeholder="Bring key to get into building"
                  className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted"
                />
              </Field>
            </div>
          </FormSection>

          {mode === "create" ? (
            <FormSection
              title="Photo Attachment"
              description="Upload a reference photo when it clarifies site or plant context."
            >
              <input
                type="file"
                name="picture"
                accept="image/*"
                className="rounded-xl border border-border-soft bg-white text-gray-900 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-700 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-brand-800"
              />
            </FormSection>
          ) : null}

          <div className="rounded-2xl border border-border-soft bg-surface-warm p-5">
            <h4 className="text-sm font-black uppercase tracking-[0.16em] text-foreground">
              {mode === "edit" ? "Edit Flow" : "Submission Flow"}
            </h4>
            <ul className="theme-copy mt-3 space-y-2 text-sm leading-6">
              {mode === "edit" ? (
                <>
                  <li>1. Adjust the fields that need correction.</li>
                  <li>2. Save — Monday sync fires automatically.</li>
                  <li>3. Review the detail page to confirm changes.</li>
                </>
              ) : (
                <>
                  <li>1. Confirm the account and work type.</li>
                  <li>2. Add plant details only when they affect execution.</li>
                  <li>
                    3. Include notes or a photo when extra context matters.
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
        <div className="theme-copy text-sm">
          {mode === "edit"
            ? "Review each field before saving. Monday sync fires automatically."
            : "Review the account details before submitting. Reference number is assigned on save."}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting}
          >
            {submitting
              ? mode === "edit"
                ? "Saving..."
                : "Submitting..."
              : submitLabel ||
                (mode === "edit" ? "Save Changes" : "Submit REQ")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FormSection({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-5">
      <h3 className="text-lg font-black tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, required = false, className = "", children }) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="theme-title mb-1 text-sm font-medium">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
