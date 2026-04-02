"use client";

import Link from "next/link";

export default function UserChip({ name, level, photoURL }) {
  const initial = name?.[0]?.toUpperCase() ?? "U";

  return (
    <Link
      href="/profile"
      className="mt-5 grid grid-cols-[52px_1fr] items-center gap-3 rounded-[20px] border border-white/10 bg-white/10 px-3 py-3 transition hover:bg-white/14 dark:bg-white/6 dark:hover:bg-white/10"
      aria-label="Open profile"
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-background text-foreground font-black">
        {initial}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate font-bold">{name ?? "User"}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/70">
          {level || "Technician"}
        </div>
      </div>
    </Link>
  );
}
