"use client";

import AppShell from "@/components/AppShell";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReqPage() {
  const router = useRouter();

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

  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/req", { method: "POST", body: fd });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit");
      }

      router.push("/tasks?created=1");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Create Work REQ">
      <section className="rounded-card bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Work Req Form</h2>

        <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Reference Number */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Reference Number</label>
              <input
                name="referenceNumber"
                defaultValue={generatedRef}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            {/* Date */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                name="date"
                defaultValue={today}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900"
                required
              />
            </div>

            {/* Tech Name */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Tech Name</label>
              <input
                name="techName"
                placeholder="Magnus"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            {/* Account */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Account</label>
              <input
                name="account"
                placeholder="Inter Pipeline"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            {/* Account Contact */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Account Contact</label>
              <input
                name="accountContact"
                placeholder="Georgia Blevins"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Account Address */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Account Address</label>
              <input
                name="accountAddress"
                placeholder="123 Sesame St."
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Action Required */}
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-sm font-medium text-gray-700">Action Required</label>
              <input
                name="actionRequired"
                placeholder="Soil top up"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Number of Plants */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Number of Plants</label>
              <input
                type="number"
                min="0"
                name="numberOfPlants"
                placeholder="4"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Which plant is wanted? */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Which plant is wanted?</label>
              <input
                name="plantWanted"
                placeholder="Aglaonema"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Which plant is getting replaced? */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Which plant is getting replaced?</label>
              <input
                name="plantReplaced"
                placeholder="Aglaonema"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Plant Size */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Plant Size</label>
              <select
                name="plantSize"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900"
                defaultValue="3 Gal"
              >
                <option>1 Gal</option>
                <option>2 Gal</option>
                <option>3 Gal</option>
                <option>5 Gal</option>
              </select>
            </div>

            {/* Plant Height */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Plant Height</label>
              <select
                name="plantHeight"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900"
                defaultValue="Shorter than 2 feet"
              >
                <option>Shorter than 2 feet</option>
                <option>2–4 feet</option>
                <option>4–6 feet</option>
                <option>Taller than 6 feet</option>
              </select>
            </div>

            {/* Planter Type and Size */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Planter Type and Size</label>
              <input
                name="planterTypeSize"
                placeholder="Lechuza 40"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Planter Colour */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Planter Colour</label>
              <input
                name="planterColour"
                placeholder="White"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Type and Colour of Staging Material */}
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-sm font-medium text-gray-700">Type and Colour of Staging Material</label>
              <input
                name="stagingMaterial"
                placeholder="Grey Spanish Moss"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Lighting */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Lighting</label>
              <select
                name="lighting"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900"
                defaultValue="Medium"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            {/* Method */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Method</label>
              <input
                name="method"
                placeholder="Use spade to insert soil"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Location */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Location</label>
              <input
                name="location"
                placeholder="Lobby"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Bring key to get into building"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Picture Upload */}
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-sm font-medium text-gray-700">Picture Upload</label>
              <input
                type="file"
                name="picture"
                accept="image/*"
                className="rounded-md border border-gray-300 bg-white file:mr-4 file:rounded-md file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-emerald-700 text-gray-900"
              />
            </div>
          </div>

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit REQ"}
            </button>

            <button
              type="button"
              onClick={() => history.back()}
              className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
