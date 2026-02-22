"use client";

export default function TopBar({ title }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <h1 className="text-[22px] font-extrabold text-brand-700">
        {title ?? "Page Title"}
      </h1>

      <button
        aria-label="Notifications"
        className="relative inline-grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <span aria-hidden>🔔</span>
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