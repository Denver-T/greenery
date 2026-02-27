import AppShell from "@/components/AppShell";
import Link from "next/link";

export default function Page() {
  return (
    <AppShell title="Tasks">
      <section className="rounded-card bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-700">Replace with tasks UI.</p>

          <Link
            href="/req"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + New REQ
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
