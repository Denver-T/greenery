// app/dashboard-analytics/page.js
import AppShell from "@/components/AppShell";
import { Suspense } from "react";

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
    <div className="rounded-card bg-white p-4 shadow-soft border border-gray-100">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
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
    <section className="rounded-card bg-white p-4 shadow-soft border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((it, i) => {
          const val = it[valueKey];
          const pct = Math.round((val / max) * 100);
          return (
            <div key={`${it[labelKey]}-${i}`} className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 text-sm text-gray-700 truncate">{it[labelKey]}</div>
              <div className="col-span-6">
                <div className="h-3 w-full rounded bg-gray-100">
                  <div
                    className="h-3 rounded bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                    aria-label={`${pct}% of max`}
                  />
                </div>
              </div>
              <div className="col-span-2 text-right text-sm tabular-nums text-gray-800">
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
  const gradient = `conic-gradient(#16a34a ${angle}deg, #e5e7eb 0deg)`; // emerald + gray-200
  return (
    <section className="rounded-card bg-white p-4 shadow-soft border border-gray-100 flex items-center gap-4">
      <div
        className="relative h-24 w-24 rounded-full"
        style={{ background: gradient }}
        role="img"
        aria-label={`${clamped}%`}
      >
        <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
          <span className="text-lg font-semibold text-gray-900">{clamped}%</span>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {caption && <p className="text-sm text-gray-600 mt-1">{caption}</p>}
      </div>
    </section>
  );
}

/**
 * MOCK DATA (works now)
 * Toggle to DB later: see "DATA SOURCE: DB" below.
 */
const mock = {
  kpis: [
    { label: "Weekly Jobs", value: 143, delta: "+12%", positive: true },
    { label: "Plants In", value: 178, delta: "+8%", positive: true },
    { label: "Revenue", value: "$18,460", delta: "-3%", positive: false },
    { label: "Avg. Ticket", value: "$129", delta: "+5%", positive: true },
  ],
  weeklyCommonJobsShare: 67, // percent
  commonJobsBreakdown: [
    { label: "Plant Replacements", value: 96 },
    { label: "Soil Top-ups", value: 30 },
    { label: "Bloom", value: 15 },
  ],
  plantsIn: [
    { label: "Orchids", value: 54 },
    { label: "Fiddle Leaf", value: 42 },
    { label: "Fern", value: 36 },
    { label: "Croton", value: 20 },
    { label: "Bloom", value: 12 },
  ],
  plantRevenue: [
    { label: "Orchids", value: 6600 },
    { label: "Moss", value: 5840 },
    { label: "Fern", value: 3436 },
    { label: "Fiddle Leaf", value: 2970 },
    { label: "Croton", value: 1180 },
  ],
};

/*
 * DATA SOURCE: DB (commented template)
 * -----------------------------------------------------------
 * When you hook up a database (Prisma/Drizzle/Query Builder),
 * you can replace the "data" constant below with something like:
 *
 * import { db } from "@/lib/db";
 *
 * async function getDashboardData() {
 *   const [jobs, plants, revenue] = await Promise.all([
 *     db.job.count({ where: { week: currentWeek() } }),
 *     db.plantIn.groupBy({
 *       by: ["type"],
 *       _sum: { count: true },
 *       where: { createdAt: { gte: startOfWeek(new Date()) } },
 *     }),
 *     db.order.aggregate({
 *       _sum: { total: true },
 *       where: { createdAt: { gte: startOfWeek(new Date()) } },
 *     }),
 *   ]);
 *
 *   return {
 *     kpis: [
 *       { label: "Weekly Jobs", value: jobs, delta: "+0%", positive: true },
 *       { label: "Plants In", value: plants.reduce((a, p) => a + p._sum.count, 0) },
 *       { label: "Revenue", value: currency(revenue._sum.total) },
 *       { label: "Avg. Ticket", value: currency(revenue._sum.total / jobs) },
 *     ],
 *     weeklyCommonJobsShare: 67,
 *     commonJobsBreakdown: [...],
 *     plantsIn: [...],
 *     plantRevenue: [...],
 *   };
 * }
 *
 * export default async function Page() {
 *   const data = await getDashboardData();
 *   ...
 * }
 * -----------------------------------------------------------
 */

export default async function Page() {
  // For now, use mock data:
  const data = mock;

  return (
    <AppShell title="Dashboard Analytics">
      <Suspense fallback={<div className="p-6 text-gray-600">Loading analytics…</div>}>
        <section className="grid grid-cols-1 gap-6 p-0 md:grid-cols-4">
          {data.kpis.map((k) => (
            <Kpi
              key={k.label}
              label={k.label}
              value={k.value}
              delta={k.delta}
              positive={k.positive}
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
      </Suspense>
    </AppShell>
  );
}