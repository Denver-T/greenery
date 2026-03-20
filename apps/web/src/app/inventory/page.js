import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell title="Inventory Analytics">
      <section className="app-panel shadow-soft p-6">
        <div className="app-badge mb-4">Inventory</div>
        <h2 className="app-title text-2xl">Inventory snapshot</h2>
        <p className="app-copy mt-2 max-w-2xl">
          This section is ready for inventory metrics, stock trends, and restock alerts.
          The shared styling is in place so new charts and tables will match the rest of the app.
        </p>
      </section>
    </AppShell>
  );
}
