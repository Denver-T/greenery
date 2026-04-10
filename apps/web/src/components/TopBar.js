"use client";

import ThemeToggle from "./ThemeToggle";
import TopBarUserMenu from "./TopBarUserMenu";

export default function TopBar({
  title,
  isDrawerOpen = false,
  onToggleDrawer,
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-soft/80 bg-surface/90 px-4 md:px-6 lg:px-8 backdrop-blur dark:border-white/10 dark:bg-[#23262de0]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-label={
            isDrawerOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isDrawerOpen}
          aria-controls="mobile-nav-drawer"
          className="md:hidden inline-grid h-11 w-11 place-items-center rounded-full border border-border-soft bg-surface text-foreground hover:bg-surface-muted dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <span aria-hidden="true" className="text-lg">
            ☰
          </span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Greenery Operations
          </p>
          <h1 className="mt-1 truncate text-lg md:text-[24px] font-black tracking-tight text-foreground">
            {title ?? "Page Title"}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />
        <div className="hidden rounded-full border border-border-soft bg-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted dark:border-white/10 dark:bg-white/5 dark:text-slate-300 lg:block">
          Live Workspace
        </div>
        <button
          aria-label="Notifications"
          className="relative inline-grid h-11 w-11 place-items-center rounded-full border border-border-soft bg-surface hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <span aria-hidden className="text-base">
            🔔
          </span>
          <span
            role="status"
            aria-label="1 new notification"
            className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white"
          >
            1
          </span>
        </button>
        <TopBarUserMenu />
      </div>
    </header>
  );
}
