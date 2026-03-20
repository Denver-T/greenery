import AppShell from "@/components/AppShell";
import { Suspense } from "react";

function maxOf(arr, key) {
  return arr.reduce((max, item) => (item[key] > max ? item[key] : max), 0);
}

function Kpi({ label, value, delta, positive = true }) {
  return (
    <div className="app-panel shadow-soft p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {delta != null ? (
          <div
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              positive
                ? "bg-brand-soft text-brand-700"
                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200"
            }`}
          >
            {positive ? "+" : "-"} {delta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HBarList({ title, items, valueKey = "value", labelKey = "label", suffix = "" }) {
  const max = Math.max(1, maxOf(items, valueKey));

  return (
    <section className="app-panel shadow-soft p-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => {
          const value = item[valueKey];
          const pct = Math.round((value / max) * 100);

          return (
            <div key={`${item[labelKey]}-${index}`} className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 truncate text-sm text-muted-foreground">
                {item[labelKey]}
              </div>
              <div className="col-span-6">
                <div className="h-3 w-full rounded-full bg-surface-subtle">
                  <div
                    className="h-3 rounded-full bg-brand transition-all"
                    style={{ width: `${pct}%` }}
                    aria-label={`${pct}% of max`}
                  />
                </div>
              </div>
              <div className="col-span-2 text-right text-sm tabular-nums text-foreground">
                {value}
                {suffix}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RingStat({ title, percent, caption }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const angle = (clamped / 100) * 360;
  const gradient = `conic-gradient(var(--brand) ${angle}deg, var(--surface-subtle) 0deg)`;

  return (
    <section className="app-panel shadow-soft flex items-center gap-4 p-4">
      <div
        className="relative h-24 w-24 rounded-full"
        style={{ background: gradient }}
        role="img"
        aria-label={`${clamped}%`}
      >
        <div className="absolute inset-2 grid place-items-center rounded-full bg-surface-strong">
          <span className="text-lg font-semibold text-foreground">{clamped}%</span>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {caption ? <p className="mt-1 text-sm text-muted-foreground">{caption}</p> : null}
      </div>
    </section>
  );
}

const mock = {
  kpis: [
    { label: "Weekly Jobs", value: 143, delta: "+12%", positive: true },
    { label: "Plants In", value: 178, delta: "+8%", positive: true },
    { label: "Revenue", value: "$18,460", delta: "-3%", positive: false },
    { label: "Avg. Ticket", value: "$129", delta: "+5%", positive: true },
  ],
  weeklyCommonJobsShare: 67,
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

export default async function Page() {
  const data = mock;

  return (
    <AppShell title="Dashboard Analytics">
      <Suspense fallback={<div className="px-2 py-6 text-muted-foreground">Loading analytics...</div>}>
        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {data.kpis.map((kpi) => (
            <Kpi key={kpi.label} {...kpi} />
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <RingStat
              title="Weekly Common Jobs"
              percent={data.weeklyCommonJobsShare}
              caption={`${100 - data.weeklyCommonJobsShare}% other work`}
            />
            <HBarList title="Breakdown" items={data.commonJobsBreakdown} />
          </div>

          <HBarList title="Plants In" items={data.plantsIn} />
          <HBarList title="Plant Revenue" items={data.plantRevenue} suffix="$" />
        </section>
      </Suspense>
    </AppShell>
  );
}
