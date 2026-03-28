import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell title="Inventory Analytics">
      <section className="rounded-card border border-border-soft bg-surface p-6 shadow-soft">
        <div className="w-fit rounded-full bg-[#f0ebde] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1f3427]">
          Inventory Workspace
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#1f3427]">
          Inventory Analytics
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          This area should become the stock and plant health workspace. When the backend data is ready,
          use this same surface style for low stock alerts, plant movement, and category breakdowns.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            "Low stock alerts",
            "Plants by location",
            "Incoming vs outgoing inventory",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-border-soft bg-[#fffdf7] p-5 shadow-soft"
            >
              <div className="text-sm font-bold uppercase tracking-[0.16em] text-gray-500">
                Planned Module
              </div>
              <div className="mt-3 text-lg font-bold text-[#1f3427]">{item}</div>
              <div className="mt-2 text-sm leading-6 text-gray-600">
                Placeholder surface ready for production data and charts.
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
