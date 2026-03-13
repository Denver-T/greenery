"use client";

import Link from "next/link";

export default function UserChip({ name }) {
  const initial = name?.[0]?.toUpperCase() ?? "U";

  return (
    <Link
      href="/profile"
      className="grid grid-cols-[40px_1fr] items-center gap-3 rounded-[10px] bg-white/15 px-3 py-2 hover:bg-white/25 transition"
      aria-label="Open profile"
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#4f6c2d] font-bold">
        {initial}
      </div>
      <div className="leading-tight">
        <div className="font-bold">{name ?? "User"}</div>
        <div className="text-xs opacity-90">Online</div>
      </div>
    </Link>
  );
}