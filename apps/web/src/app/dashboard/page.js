"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "@/components/AppShell";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import { fetchApi } from "@/lib/api/api";

function maxOf(arr, key) {
  return arr.reduce((m, x) => (x[key] > m ? x[key] : m), 0);
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

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No time scheduled";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isToday(value) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="theme-kpi mt-1 text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function HBarList({ title, items, valueKey = "value", labelKey = "label" }) {
  const max = Math.max(1, maxOf(items, valueKey));

  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="theme-title text-lg font-bold">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((it, i) => {
          const val = it[valueKey];
          const pct = Math.round((val / max) * 100);
          return (
            <div key={`${it[labelKey]}-${i}`} className="grid grid-cols-12 items-center gap-3">
              <div className="theme-copy col-span-4 truncate text-sm">{it[labelKey]}</div>
              <div className="col-span-6">
                <div className="h-3 w-full rounded bg-surface-muted">
                  <div
                    className="h-3 rounded bg-brand transition-all"
                    style={{ width: `${pct}%` }}
                    aria-label={`${pct}% of max`}
                  />
                </div>
              </div>
              <div className="theme-title col-span-2 text-right text-sm tabular-nums font-semibold">
                {val}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionCard({ title, description, href, actionLabel }) {
  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="theme-title text-lg font-bold">{title}</h3>
      <p className="theme-copy mt-2 text-sm leading-6">{description}</p>
      <Link
        href={href}
        className="theme-button mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
      >
        {actionLabel}
      </Link>
    </section>
  );
}

function FocusList({ title, items, empty }) {
  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="theme-title text-lg font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="theme-copy mt-3 text-sm">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={`${item.title}-${item.meta}`} className="theme-subcard rounded-xl border px-4 py-3">
              <div className="theme-title font-semibold">{item.title}</div>
              <div className="theme-copy mt-1 text-sm">{item.meta}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleList({ title, items, empty }) {
  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="theme-title text-lg font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="theme-copy mt-3 text-sm">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="theme-subcard flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div className="theme-title font-medium">{item.label}</div>
              <div className="theme-copy text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function buildDashboardData({ employees, reqs, tasks, schedule }) {
  const activeReqs = reqs.filter(
    (req) => !["completed", "cancelled"].includes(String(req.status || "").toLowerCase())
  );
  const assignedTasks = tasks.filter((task) => task.assignedTo ?? task.assigned_to);
  const todaysSchedule = schedule
    .filter((event) => isToday(event.start_time))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const unassignedReqs = activeReqs
    .filter((req) => !req.assignedTo && !req.assigned_to)
    .slice(0, 4)
    .map((req) => ({
      title: req.actionRequired || req.referenceNumber || "Open request",
      meta: `${req.account || "Unknown account"}${req.location ? ` • ${req.location}` : ""}`,
    }));

  const dueSoon = assignedTasks
    .filter((task) => task.dueDate || task.due_date)
    .sort((a, b) => new Date(a.dueDate || a.due_date) - new Date(b.dueDate || b.due_date))
    .slice(0, 4)
    .map((task) => ({
      title: task.actionRequired || task.title || task.referenceNumber || "Assigned task",
      meta: `Due ${String(task.dueDate || task.due_date).slice(0, 10)}${task.account ? ` • ${task.account}` : ""}`,
    }));

  const nextStops = todaysSchedule.slice(0, 4).map((event) => ({
    title: event.title || "Scheduled stop",
    meta: `${event.employee_name || "Unassigned"} • ${formatDateTime(event.start_time)}`,
  }));

  return {
    kpis: [
      { label: "Employees", value: employees.length },
      { label: "Open REQs", value: activeReqs.length },
      { label: "Assigned Tasks", value: assignedTasks.length },
      { label: "Stops Today", value: todaysSchedule.length },
    ],
    activeReqs,
    todaysSchedule,
    unassignedReqs,
    dueSoon,
    nextStops,
    actionRequiredBreakdown: countBy(activeReqs, (req) => req.actionRequired),
    accountLoad: countBy(activeReqs, (req) => req.account),
    byAssignee: countBy(todaysSchedule, (event) => event.employee_name || "Unassigned").map((item) => ({
      label: item.label,
      value: `${item.value} stop${item.value === 1 ? "" : "s"} today`,
    })),
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
      {loading ? <div className="theme-copy p-6">Loading analytics…</div> : null}
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 text-red-700 shadow-soft">
          {error}
        </div>
      ) : null}
      {!loading && !error ? (
        <>
          <WorkspaceHeader
            eyebrow="Operations Overview"
            title="Today’s command surface"
            description="Prioritize live work, staffing pressure, and today’s schedule from one operating view."
            stats={[
              { label: "open requests", value: data.kpis[1]?.value ?? 0 },
              { label: "assigned tasks", value: data.kpis[2]?.value ?? 0 },
              { label: "stops today", value: data.kpis[3]?.value ?? 0 },
            ]}
          />

          <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
            {data.kpis.map((k) => (
              <Kpi key={k.label} label={k.label} value={k.value} />
            ))}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <ActionCard
              title="Review request queue"
              description={`${data.activeReqs.length} open request${data.activeReqs.length === 1 ? "" : "s"} currently need attention.`}
              href="/tasks"
              actionLabel="Open queue"
            />
            <ActionCard
              title="Manage assignments"
              description="Match open work to the right employee and update due dates."
              href="/assigntasks"
              actionLabel="Open assignments"
            />
            <ActionCard
              title="Check today’s schedule"
              description={`${data.todaysSchedule.length} scheduled stop${data.todaysSchedule.length === 1 ? "" : "s"} are on today’s board.`}
              href="/calendar"
              actionLabel="Open schedule"
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <FocusList
              title="Unassigned Requests"
              items={data.unassignedReqs}
              empty="No unassigned requests are waiting in the queue."
            />
            <FocusList
              title="Due Soon"
              items={data.dueSoon}
              empty="No assigned tasks are due soon."
            />
            <FocusList
              title="Next Stops"
              items={data.nextStops}
              empty="No stops are scheduled for today."
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <HBarList title="Open Work by Type" items={data.actionRequiredBreakdown} />
            <HBarList title="Open Work by Account" items={data.accountLoad} />
            <ScheduleList
              title="Today’s Coverage"
              items={data.byAssignee}
              empty="No technicians are scheduled today."
            />
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
