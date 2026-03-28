"use client";

export default function TopBar({ title }) {
  return (
    <header className="flex items-center justify-between border-b border-border-soft/80 bg-surface/90 px-8 backdrop-blur">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Greenery Operations
        </p>
        <h1 className="mt-1 text-[24px] font-black tracking-tight text-[#1f3427]">
          {title ?? "Page Title"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden rounded-full border border-border-soft bg-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted md:block">
          Live Workspace
        </div>
        <button
          aria-label="Notifications"
          className="relative inline-grid h-11 w-11 place-items-center rounded-full border border-border-soft bg-surface hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span aria-hidden className="text-base">🔔</span>
          <span
            role="status"
            aria-label="1 new notification"
            className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white"
          >
            1
          </span>
        </button>
      </div>
    </header>
  );
}
