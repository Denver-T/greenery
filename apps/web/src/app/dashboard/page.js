"use client";

import AppShell from "@/components/AppShell";
import { fetchApi } from "@/lib/api/api";
import { useEffect, useMemo, useState } from "react";

/**
 * Helper: compute max for simple bar charts
 */
function maxOf(arr, key) {
  return arr.reduce((m, x) => (x[key] > m ? x[key] : m), 0);
}

/**
 * KPI Tile
 */
function Kpi({ label, value, delta, positive = true }) {
  return (
    <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-3xl font-black tracking-tight text-[#1f3427]">{value}</div>
        {delta != null && (
          <div
            className={`text-xs px-2 py-0.5 rounded-full ${
              positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {positive ? "▲" : "▼"} {delta}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple horizontal bar list
 */
function HBarList({ title, items, valueKey = "value", labelKey = "label", suffix = "" }) {
  const max = Math.max(1, maxOf(items, valueKey));
  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="text-lg font-bold text-[#1f3427]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((it, i) => {
          const val = it[valueKey];
          const pct = Math.round((val / max) * 100);
          return (
            <div key={`${it[labelKey]}-${i}`} className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 truncate text-sm text-foreground/80">{it[labelKey]}</div>
              <div className="col-span-6">
                <div className="h-3 w-full rounded bg-surface-muted">
                  <div
                    className="h-3 rounded bg-brand transition-all"
                    style={{ width: `${pct}%` }}
                    aria-label={`${pct}% of max`}
                  />
                </div>
              </div>
              <div className="col-span-2 text-right text-sm tabular-nums font-semibold text-[#1f3427]">
                {val}
                {suffix}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Simple ring (donut-style) KPI for % share using pure CSS
 */
function RingStat({ title, percent, caption }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const angle = (clamped / 100) * 360;
  const gradient = `conic-gradient(#5f7d4b ${angle}deg, #f0ebde 0deg)`;
  return (
    <section className="rounded-card flex items-center gap-4 border border-border-soft bg-surface p-5 shadow-soft">
      <div
        className="relative h-24 w-24 rounded-full"
        style={{ background: gradient }}
        role="img"
        aria-label={`${clamped}%`}
      >
        <div className="absolute inset-2 grid place-items-center rounded-full bg-surface">
          <span className="text-lg font-black text-[#1f3427]">{clamped}%</span>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#1f3427]">{title}</h3>
        {caption && <p className="mt-1 text-sm text-muted">{caption}</p>}
      </div>
    </section>
  );
}

function countBy(items, selector) {
  const map = new Map();
  items.forEach((item) => {
    const key = selector(item) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function buildDashboardData({ employees, reqs, tasks, schedule }) {
  const activeReqs = reqs.filter(
    (req) => !["completed", "cancelled"].includes(String(req.status || "").toLowerCase())
  );
  const assignedTasks = tasks.filter((task) => task.assignedTo ?? task.assigned_to);
  const completedTasks = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "completed"
  );

  return {
    kpis: [
      { label: "Employees", value: employees.length },
      { label: "Open REQs", value: activeReqs.length },
      { label: "Assigned Tasks", value: assignedTasks.length },
      { label: "Schedule Events", value: schedule.length },
    ],
    weeklyCommonJobsShare:
      tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    commonJobsBreakdown: countBy(reqs, (req) => req.actionRequired),
    plantsIn: countBy(reqs, (req) => req.account),
    plantRevenue: countBy(schedule, (event) => event.employee_name || "Unassigned"),
  };
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceData, setSourceData] = useState({
    employees: [],
    reqs: [],
    tasks: [],
    schedule: [],
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const [employees, reqs, tasks, schedule] = await Promise.all([
          fetchApi("/employees"),
          fetchApi("/reqs"),
          fetchApi("/tasks?scope=assignment"),
          fetchApi("/schedule"),
        ]);

        if (!cancelled) {
          setSourceData({
            employees: Array.isArray(employees) ? employees : [],
            reqs: Array.isArray(reqs) ? reqs : [],
            tasks: Array.isArray(tasks) ? tasks : [],
            schedule: Array.isArray(schedule) ? schedule : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load dashboard");
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
  }, []);

  const data = useMemo(() => buildDashboardData(sourceData), [sourceData]);

  return (
    <AppShell title="Dashboard Analytics">
      {loading ? <div className="p-6 text-gray-600">Loading analytics…</div> : null}
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 text-red-700 shadow-soft">
          {error}
        </div>
      ) : null}
      {!loading && !error ? (
        <>
        <section className="grid grid-cols-1 gap-6 p-0 md:grid-cols-4">
          {data.kpis.map((k) => (
            <Kpi
              key={k.label}
              label={k.label}
              value={k.value}
            />
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Weekly Common Jobs: ring + breakdown */}
          <div className="space-y-4">
            <RingStat
            title="Weekly Common Jobs"
            percent={data.weeklyCommonJobsShare}
            caption={`${100 - data.weeklyCommonJobsShare}% other work`}
          />
            <HBarList title="Breakdown" items={data.commonJobsBreakdown} />
          </div>

          {/* Plants In */}
          <HBarList title="Plants In" items={data.plantsIn} />

          {/* Plant Revenue */}
          <HBarList
            title="Plant Revenue"
            items={data.plantRevenue}
            suffix="$"
            // Show dollars with thousands separators in the number cell:
          />
        </section>
        </>
      ) : null}
    </AppShell>
  );
}
