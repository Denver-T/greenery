"use client";

export default function TopBar({ title }) {
  return (
    <header className="mx-4 mt-4 flex items-center justify-between rounded-[24px] border border-border bg-surface px-5 py-4 shadow-soft backdrop-blur-md md:mx-6 md:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Greenery Workspace
        </p>
        <h1 className="app-title text-[22px]">{title ?? "Page Title"}</h1>
      </div>

      <button
        aria-label="Notifications"
        className="relative inline-grid h-11 w-11 place-items-center rounded-full border border-border bg-surface-strong text-foreground hover:-translate-y-0.5 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <span aria-hidden className="text-lg font-black">
          !
        </span>
        <span
          role="status"
          aria-label="1 new notification"
          className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[12px] font-bold text-white"
        >
          1
        </span>
      </button>
    </header>
  );
}
