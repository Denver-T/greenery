"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

import AppShell from "@/components/AppShell";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import { fetchApi } from "@/lib/api/api";

/* ─── Constants ─── */

const TAB_IDS = ["operations", "analytics"];

const PERIOD_OPTIONS = ["7d", "30d", "90d", "1y", "all"];

const STATUS_COLORS = [
  "var(--brand)",
  "var(--accent)",
  "#6b8b57",
  "#a3c290",
  "var(--muted)",
];

/* ─── Helpers ─── */

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

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPeriodLabel(period) {
  try {
    const date = parseISO(period);
    if (period.endsWith("-01") && period.length === 10) {
      return format(date, "MMM yyyy");
    }
    return format(date, "MMM d");
  } catch {
    return period;
  }
}

/* ─── Shared Components ─── */

function Kpi({ label, value }) {
  return (
    <div className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function HBarList({ title, items, valueKey = "value", labelKey = "label", empty }) {
  const max = Math.max(1, maxOf(items, valueKey));

  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="theme-copy mt-3 text-sm">{empty || "No data yet."}</p>
      ) : (
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
                      className="h-3 rounded bg-brand transition-[width] duration-200"
                      style={{ width: `${pct}%` }}
                      aria-label={`${pct}% of max`}
                    />
                  </div>
                </div>
                <div className="col-span-2 text-right text-sm tabular-nums font-semibold text-foreground">
                  {val}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActionCard({ title, description, href, actionLabel }) {
  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-foreground"
      >
        {actionLabel}
      </Link>
    </section>
  );
}

function FocusList({ title, items, empty }) {
  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="theme-copy mt-3 text-sm">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={`${item.title}-${item.meta}`} className="rounded-xl border border-border-soft bg-surface px-4 py-3">
              <div className="font-semibold text-foreground">{item.title}</div>
              <div className="mt-1 text-sm text-gray-600">{item.meta}</div>
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
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="theme-copy mt-3 text-sm">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3"
            >
              <div className="font-medium text-foreground">{item.label}</div>
              <div className="text-sm font-semibold text-gray-600">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StockIndicator({ quantity, demand }) {
  if (demand === 0 || quantity > demand * 2) {
    return <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Healthy</span>;
  }
  if (quantity > 0) {
    return <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-700"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />Watch</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />Critical</span>;
}

/* ─── Operations Data Builder ─── */

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

/* ─── Main Page ─── */

export default function Page() {
  /* --- Operations state --- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceData, setSourceData] = useState({
    employees: [],
    reqs: [],
    tasks: [],
    schedule: [],
  });

  /* --- Tab state --- */
  const [activeTab, setActiveTab] = useState("operations");

  /* --- Analytics state --- */
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [period, setPeriod] = useState("30d");
  const lastFetchedPeriod = useRef(null);

  /* --- Operations data fetch --- */
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

  /* --- Analytics data fetch (lazy) --- */
  const analyticsRequestId = useRef(0);

  useEffect(() => {
    if (activeTab !== "analytics" || period === lastFetchedPeriod.current) return;

    lastFetchedPeriod.current = period;
    const requestId = ++analyticsRequestId.current;

    setAnalyticsLoading(true);
    setAnalyticsError("");

    fetchApi(`/analytics/summary?period=${period}`)
      .then((data) => {
        if (analyticsRequestId.current === requestId) {
          setAnalytics(data);
        }
      })
      .catch((err) => {
        if (analyticsRequestId.current === requestId) {
          setAnalyticsError(err?.message || "Failed to load analytics.");
        }
      })
      .finally(() => {
        if (analyticsRequestId.current === requestId) {
          setAnalyticsLoading(false);
        }
      });
  }, [activeTab, period]);

  /* --- Derived data --- */
  const data = useMemo(() => buildDashboardData(sourceData), [sourceData]);

  const operationsStats = [
    { label: "open requests", value: data.kpis[1]?.value ?? 0 },
    { label: "assigned tasks", value: data.kpis[2]?.value ?? 0 },
    { label: "stops today", value: data.kpis[3]?.value ?? 0 },
  ];

  const analyticsStats = analytics?.overview
    ? [
        { label: "plant types", value: analytics.overview.types },
        { label: "units on hand", value: analytics.overview.units },
        { label: "low stock", value: analytics.overview.lowStock },
      ]
    : [
        { label: "plant types", value: "—" },
        { label: "units on hand", value: "—" },
        { label: "low stock", value: "—" },
      ];

  /* --- Tab keyboard handler --- */
  function handleTabKeyDown(e) {
    const idx = TAB_IDS.indexOf(activeTab);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % TAB_IDS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TAB_IDS.length) % TAB_IDS.length;
    else return;
    e.preventDefault();
    setActiveTab(TAB_IDS[next]);
    document.getElementById(`tab-${TAB_IDS[next]}`)?.focus();
  }

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
            title={activeTab === "operations" ? "Today's command surface" : "Plant analytics"}
            description={
              activeTab === "operations"
                ? "Prioritize live work, staffing pressure, and today's schedule from one operating view."
                : "Track plant demand, replacement patterns, and stock health over time."
            }
            stats={activeTab === "operations" ? operationsStats : analyticsStats}
          />

          {/* ── Tab Bar ── */}
          <div role="tablist" aria-label="Dashboard views" className="mt-6 flex gap-1 rounded-2xl bg-surface-muted p-1 w-fit">
            {[
              { id: "operations", label: "Operations" },
              { id: "analytics", label: "Plant Analytics" },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleTabKeyDown}
                className={
                  activeTab === tab.id
                    ? "rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                    : "rounded-xl px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Operations Tab Panel ── */}
          <div
            role="tabpanel"
            id="panel-operations"
            aria-labelledby="tab-operations"
            hidden={activeTab !== "operations"}
          >
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
                title="Check today's schedule"
                description={`${data.todaysSchedule.length} scheduled stop${data.todaysSchedule.length === 1 ? "" : "s"} are on today's board.`}
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
                title="Today's Coverage"
                items={data.byAssignee}
                empty="No technicians are scheduled today."
              />
            </section>
          </div>

          {/* ── Plant Analytics Tab Panel ── */}
          <div
            role="tabpanel"
            id="panel-analytics"
            aria-labelledby="tab-analytics"
            hidden={activeTab !== "analytics"}
          >
            {analyticsLoading ? (
              <div className="theme-copy mt-6 p-6">Loading plant analytics…</div>
            ) : analyticsError ? (
              <div className="mt-6 rounded-card border border-red-200 bg-red-50 p-4 text-red-700 shadow-soft">
                {analyticsError}
              </div>
            ) : analytics ? (
              <div className="space-y-6 mt-6">
                {/* Period Selector */}
                <div className="flex items-center gap-2">
                  {PERIOD_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={
                        period === p
                          ? "rounded-xl bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white"
                          : "rounded-xl bg-surface-muted px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface"
                      }
                    >
                      {p === "all" ? "All" : p}
                    </button>
                  ))}
                </div>

                {/* KPI Row */}
                <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
                  <Kpi label="Plant Types" value={analytics.overview.types} />
                  <Kpi label="Units on Hand" value={analytics.overview.units} />
                  <Kpi label="Inventory Value" value={formatCurrency(analytics.overview.value)} />
                  <Kpi label="Low Stock" value={analytics.overview.lowStock} />
                </section>

                {/* Charts Row */}
                <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div role="img" aria-label="Requests over time bar chart" className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
                    <h3 className="text-lg font-bold text-foreground">Requests Over Time</h3>
                    {analytics.requestsOverTime.length === 0 ? (
                      <p className="theme-copy mt-4 text-sm">No request data for this period.</p>
                    ) : (
                      <div className="mt-4" style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer>
                          <BarChart data={analytics.requestsOverTime}>
                            <XAxis dataKey="period" tickFormatter={formatPeriodLabel} tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip labelFormatter={formatPeriodLabel} />
                            <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div role="img" aria-label="Requests by status pie chart" className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
                    <h3 className="text-lg font-bold text-foreground">Requests by Status</h3>
                    {analytics.requestsByStatus.length === 0 ? (
                      <p className="theme-copy mt-4 text-sm">No request data for this period.</p>
                    ) : (
                      <div className="mt-4" style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={analytics.requestsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                              {analytics.requestsByStatus.map((entry, i) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </section>

                {/* Ranked Lists Row */}
                <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <HBarList
                    title="Top Requested Plants"
                    items={analytics.topRequested.map((r) => ({ label: r.plant, value: r.count }))}
                    empty="No plant requests in this period."
                  />
                  <HBarList
                    title="Top Replaced Plants"
                    items={analytics.topReplaced.map((r) => ({ label: r.plant, value: r.count }))}
                    empty="No plant replacements in this period."
                  />
                  <HBarList
                    title="Top Accounts by Volume"
                    items={analytics.topAccountsByVolume.map((a) => ({ label: a.label, value: a.count }))}
                    empty="No account data in this period."
                  />
                </section>

                {/* Stock vs Demand Table */}
                <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
                  <h3 className="text-lg font-bold text-foreground">Stock vs Demand</h3>
                  {analytics.stockVsDemand.length === 0 ? (
                    <p className="theme-copy mt-3 text-sm">No plant inventory tracked yet.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-border-soft">
                            <th scope="col" className="pb-3 font-semibold text-muted">Plant</th>
                            <th scope="col" className="pb-3 text-right font-semibold text-muted">In Stock</th>
                            <th scope="col" className="pb-3 text-right font-semibold text-muted">Open Reqs</th>
                            <th scope="col" className="pb-3 text-right font-semibold text-muted">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.stockVsDemand.map((row) => (
                            <tr key={row.name} className="border-b border-border-soft last:border-0">
                              <td className="py-3 font-medium text-foreground">{row.name}</td>
                              <td className="py-3 text-right tabular-nums text-foreground">{row.quantity}</td>
                              <td className="py-3 text-right tabular-nums text-foreground">{row.openRequests}</td>
                              <td className="py-3 text-right">
                                <StockIndicator quantity={row.quantity} demand={row.openRequests} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Low Stock Watch */}
                <section className="rounded-card border border-border-soft bg-surface p-5 shadow-soft">
                  <h3 className="text-lg font-bold text-foreground">Low Stock Watch</h3>
                  {analytics.lowStockPlants.length === 0 ? (
                    <p className="theme-copy mt-3 text-sm">No low-stock plants right now.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {analytics.lowStockPlants.map((plant) => (
                        <div key={plant.name} className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3">
                          <div>
                            <div className="font-semibold text-foreground">{plant.name}</div>
                            <div className="text-sm text-muted">{formatCurrency(plant.cost_per_unit)} per unit</div>
                          </div>
                          <div className="text-sm font-bold text-red-600">{plant.quantity} left</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="theme-copy mt-6 p-6">Select the Plant Analytics tab to load data.</div>
            )}
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
