"use client";

import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";
import { getTodayDateInputValue, sanitizeObjectStrings } from "@/lib/inputSafety";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function ReqPage() {
  const router = useRouter();
  const accountAddressRef = useRef(null);

  const generatedRef = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    return `REQ-${y}${m}${day}-${h}${mi}${s}`;
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [loadingEmployee, setLoadingEmployee] = useState(true);

  const today = getTodayDateInputValue();
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const me = await fetchApi("/auth/me", { cache: "no-store" });
        if (active) {
          setCurrentEmployeeName(me?.name || "");
        }
      } catch (err) {
        if (active) {
          setError(err?.message || "Failed to load the signed-in employee.");
        }
      } finally {
        if (active) {
          setLoadingEmployee(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapsApiKey || !accountAddressRef.current || typeof window === "undefined") {
      return undefined;
    }

    let autocomplete = null;
    let listener = null;

    function attachAutocomplete() {
      if (!window.google?.maps?.places || !accountAddressRef.current) {
        return;
      }

      autocomplete = new window.google.maps.places.Autocomplete(accountAddressRef.current, {
        fields: ["formatted_address"],
        types: ["address"],
      });

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place?.formatted_address && accountAddressRef.current) {
          accountAddressRef.current.value = place.formatted_address;
        }
      });
    }

    if (window.google?.maps?.places) {
      attachAutocomplete();
    } else {
      const existingScript = document.getElementById("google-maps-places-script");

      if (existingScript) {
        existingScript.addEventListener("load", attachAutocomplete, { once: true });
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

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const fd = new FormData(e.currentTarget);
      if (!currentEmployeeName) {
        throw new Error("Your employee account could not be resolved. Please sign in again.");
      }

      const cleaned = sanitizeObjectStrings(
        {
          referenceNumber: fd.get("referenceNumber"),
          techName: currentEmployeeName,
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
          referenceNumber: { maxLength: REQ_LIMITS.referenceNumber },
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
        }
      );

      if (!cleaned.account) {
        throw new Error("Account is required.");
      }

      if (!cleaned.actionRequired) {
        throw new Error("Action Required is required.");
      }

      Object.entries(cleaned).forEach(([key, value]) => fd.set(key, value));
      fd.set("techName", currentEmployeeName);

      await fetchApi("/reqs", {
        method: "POST",
        body: fd,
      });

      router.push("/tasks?created=1");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Create Work REQ">
      <section className="mb-6 rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="theme-tag w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
              Request Intake
            </div>
            <h2 className="theme-title mt-4 text-2xl font-black tracking-tight">
              Create Work Request
            </h2>
            <p className="theme-copy mt-2 max-w-2xl text-sm leading-6">
              Capture the core request details first, then add plant and staging information if needed.
            </p>
          </div>

          <div className="theme-panel-muted min-w-[220px] rounded-2xl border px-4 py-4">
            <div className="theme-copy text-xs font-bold uppercase tracking-[0.18em]">
              Generated Reference
            </div>
            <div className="theme-title mt-2 text-lg font-black">{generatedRef}</div>
            <div className="theme-copy mt-1 text-sm">Request date {today}</div>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <FormSection
                title="Core Details"
                description="Identify the request, the submitter, and the account."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Reference Number" required>
                    <input
                      name="referenceNumber"
                      defaultValue={generatedRef}
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400"
                      required
                    />
                  </Field>
                  <Field label="Date" required>
                    <input type="hidden" name="requestDate" value={today} />
                    <div className="theme-panel-muted rounded-xl border px-3 py-2.5 theme-title">
                      {today}
                    </div>
                    <span className="theme-copy mt-1 text-xs">
                      Requests are always stamped with the current day.
                    </span>
                  </Field>
                  <Field label="Tech Name" required>
                    <input
                      name="techName"
                      value={currentEmployeeName}
                      readOnly
                      className="theme-panel-muted theme-title rounded-xl border px-3 py-2.5 outline-none"
                      required
                    />
                    <span className="theme-copy mt-1 text-xs">
                      Pulled from the signed-in employee account.
                    </span>
                  </Field>
                  <Field label="Account" required>
                    <input
                      name="account"
                      maxLength={REQ_LIMITS.account}
                      placeholder="Inter Pipeline"
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
                      required
                    />
                  </Field>
                  <Field label="Account Contact">
                    <input
                      name="accountContact"
                      maxLength={REQ_LIMITS.accountContact}
                      placeholder="Georgia Blevins"
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
                    />
                  </Field>
                  <Field label="Account Address">
                    <input
                      ref={accountAddressRef}
                      name="accountAddress"
                      maxLength={REQ_LIMITS.accountAddress}
                      placeholder="123 Sesame St."
                      autoComplete="street-address"
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
                    />
                    <span className="theme-copy mt-1 text-xs">
                      Browser autofill works now. Google Places autocomplete will turn on when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set.
                    </span>
                  </Field>
                  <Field label="Action Required" required className="md:col-span-2">
                    <input
                      name="actionRequired"
                      maxLength={REQ_LIMITS.actionRequired}
                      placeholder="Soil top up"
                      className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
                      required
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
                    <input type="number" min="0" name="numberOfPlants" placeholder="4" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Plant Wanted">
                    <input name="plantWanted" maxLength={REQ_LIMITS.plantWanted} placeholder="Aglaonema" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Plant Replaced">
                    <input name="plantReplaced" maxLength={REQ_LIMITS.plantReplaced} placeholder="Aglaonema" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Plant Size">
                    <select name="plantSize" defaultValue="3 Gal" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400">
                      <option>1 Gal</option>
                      <option>2 Gal</option>
                      <option>3 Gal</option>
                      <option>5 Gal</option>
                    </select>
                  </Field>
                  <Field label="Plant Height">
                    <select name="plantHeight" defaultValue="Shorter than 2 feet" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400">
                      <option>Shorter than 2 feet</option>
                      <option>2-4 feet</option>
                      <option>4-6 feet</option>
                      <option>Taller than 6 feet</option>
                    </select>
                  </Field>
                  <Field label="Planter Type and Size">
                    <input name="planterTypeSize" maxLength={REQ_LIMITS.planterTypeSize} placeholder="Lechuza 40" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Planter Colour">
                    <input name="planterColour" maxLength={REQ_LIMITS.planterColour} placeholder="White" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Staging Material" className="md:col-span-2">
                    <input name="stagingMaterial" maxLength={REQ_LIMITS.stagingMaterial} placeholder="Grey Spanish Moss" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
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
                    <select name="lighting" defaultValue="Medium" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </Field>
                  <Field label="Method">
                    <input name="method" maxLength={REQ_LIMITS.method} placeholder="Use spade to insert soil" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Location">
                    <input name="location" maxLength={REQ_LIMITS.location} placeholder="Lobby" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                  <Field label="Notes">
                    <textarea name="notes" rows={4} maxLength={REQ_LIMITS.notes} placeholder="Bring key to get into building" className="rounded-xl border border-border-soft bg-white px-3 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400" />
                  </Field>
                </div>
              </FormSection>

              <FormSection
                title="Photo Attachment"
                description="Upload a reference photo when it clarifies site or plant context."
              >
                <input
                  type="file"
                  name="picture"
                  accept="image/*"
                  className="rounded-xl border border-border-soft bg-white text-gray-900 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-700 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-emerald-800"
                />
              </FormSection>

              <div className="theme-panel-muted rounded-2xl border p-5">
                <h4 className="theme-title text-sm font-black uppercase tracking-[0.16em]">
                  Submission Flow
                </h4>
                <ul className="theme-copy mt-3 space-y-2 text-sm leading-6">
                  <li>1. Confirm the account and work type.</li>
                  <li>2. Add plant details only when they affect execution.</li>
                  <li>3. Include notes or a photo when extra context matters.</li>
                </ul>
              </div>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
            <div className="theme-copy text-sm">
              Review the account details before submitting. After save, you will return to the queue.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl bg-gray-200 px-4 py-2.5 font-medium text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loadingEmployee || !currentEmployeeName}
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit REQ"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

function FormSection({ title, description, children }) {
  return (
    <div className="theme-panel rounded-2xl border p-5">
      <h3 className="theme-title text-lg font-black tracking-tight">{title}</h3>
      <p className="theme-copy mt-1 text-sm leading-6">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, required = false, className = "", children }) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="theme-title mb-1 text-sm font-medium">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
