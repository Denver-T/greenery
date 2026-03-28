"use client";

import Link from "next/link";

export default function UserChip({ name }) {
  const initial = name?.[0]?.toUpperCase() ?? "U";

  return (
    <Link
      href="/profile"
      className="mt-5 grid grid-cols-[44px_1fr] items-center gap-3 rounded-[18px] border border-white/10 bg-white/10 px-3 py-3 transition hover:bg-white/14"
      aria-label="Open profile"
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f4f1e8] text-[#294733] font-black">
        {initial}
      </div>
      <div className="leading-tight">
        <div className="font-bold">{name ?? "User"}</div>
        <div className="text-xs uppercase tracking-[0.16em] text-white/70">Online</div>
      </div>
    </Link>
  );
}
