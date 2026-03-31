"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import { fetchApi } from "@/lib/api/api";

function countBy(items, selector) {
  const map = new Map();
  items.forEach((item) => {
    const key = selector(item) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plants, setPlants] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [schedule, setSchedule] = useState([]);

  async function loadInventorySurface() {
    setLoading(true);
    setError("");

    try {
      const [plantsData, reqsData, scheduleData] = await Promise.all([
        fetchApi("/plants", { cache: "no-store" }),
        fetchApi("/reqs", { cache: "no-store" }),
        fetchApi("/schedule", { cache: "no-store" }),
      ]);

      setPlants(Array.isArray(plantsData) ? plantsData : plantsData?.data || []);
      setReqs(Array.isArray(reqsData) ? reqsData : reqsData?.data || []);
      setSchedule(Array.isArray(scheduleData) ? scheduleData : scheduleData?.data || []);
    } catch (err) {
      setError(err?.message || "Failed to load inventory workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventorySurface();
  }, []);

  const plantReqs = useMemo(
    () =>
      reqs.filter((req) =>
        [req.plantWanted, req.plantReplaced, req.numberOfPlants, req.planterTypeSize]
          .some((value) => value !== null && value !== undefined && String(value).trim() !== ""),
      ),
    [reqs],
  );

  const weeklyStops = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    return schedule.filter((event) => {
      const start = new Date(event.start_time);
      return start >= now && start <= weekEnd;
    });
  }, [schedule]);

  const locationLoad = useMemo(() => countBy(plants, (plant) => plant.location).slice(0, 6), [plants]);

  return (
    <AppShell title="Inventory">
      <section className="space-y-6 p-6">
        <WorkspaceHeader
          eyebrow="Inventory Workspace"
          title="Plant coverage and inventory snapshot"
          description="Read-only visibility into tracked plants, plant-heavy requests, and upcoming stops."
          stats={[
            { label: "plants tracked", value: plants.length },
            { label: "plant-driven requests", value: plantReqs.length },
            { label: "stops in next 7 days", value: weeklyStops.length },
          ]}
        />

        <WorkspaceToolbar
          left={
            <>
              <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-soft">
                Limited release
              </span>
              <span className="text-sm text-gray-600">
                Live plant data is available now. Stock movement and purchasing stay out of scope for this release.
              </span>
            </>
          }
          right={
            <button
              onClick={loadInventorySurface}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Refresh
            </button>
          }
        />

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 p-4 text-red-700 shadow-soft">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Kpi label="Plants tracked" value={plants.length} />
          <Kpi
            label="Active locations"
            value={new Set(plants.map((plant) => plant.location).filter(Boolean)).size}
          />
          <Kpi label="Plant work in queue" value={plantReqs.length} />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">Tracked plants</h2>
                <p className="mt-1 text-sm text-gray-600">Current live rows from the plants table.</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                Read only
              </span>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-gray-600">Loading plants…</p>
            ) : plants.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No plants are tracked yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left text-sm font-bold text-gray-700">
                      <th className="px-3 py-3">Plant</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plants.map((plant) => (
                      <tr key={plant.id} className="border-b text-sm text-gray-800">
                        <td className="px-3 py-3">{plant.name || "-"}</td>
                        <td className="px-3 py-3">{plant.location || "-"}</td>
                        <td className="px-3 py-3">
                          {plant.created_at ? String(plant.created_at).slice(0, 10) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">Plant load by location</h3>

              {loading ? (
                <p className="mt-4 text-sm text-gray-600">Loading locations…</p>
              ) : locationLoad.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No plant locations are available yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {locationLoad.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3"
                    >
                      <div className="font-medium text-foreground">{item.label}</div>
                      <div className="text-sm font-semibold text-gray-600">
                        {item.value} plant{item.value === 1 ? "" : "s"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">Plant-heavy requests</h3>
              {loading ? (
                <p className="mt-4 text-sm text-gray-600">Loading requests…</p>
              ) : plantReqs.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No open plant-heavy requests are in the queue.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {plantReqs.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border-soft bg-surface px-4 py-3"
                    >
                      <div className="font-semibold text-foreground">
                        {req.actionRequired || req.referenceNumber || "Plant request"}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {[req.account, req.location].filter(Boolean).join(" • ") || "No account or location"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
