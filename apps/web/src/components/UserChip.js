"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

function formatRole(role) {
  const normalized = String(role || "").trim().toLowerCase();

  switch (normalized) {
    case "administrator":
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "technician":
    case "employee":
      return "Employee";
    default:
      return "Active";
  }
}

export default function UserChip({ name }) {
  const { account } = useAuth();
  const displayName = account?.name || name || "User";
  const initial = displayName?.[0]?.toUpperCase() ?? "U";

  return (
    <Link
      href="/profile"
      className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3 rounded-[18px] border border-white/12 bg-white/10 px-3 py-3 backdrop-blur-sm hover:bg-white/16"
      aria-label="Open profile"
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#4f6c2d] font-bold shadow-elevated">
        {initial}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate font-bold text-white" title={displayName}>
          {displayName}
        </div>
        <div className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
          {formatRole(account?.permissionLevel || account?.role)}
        </div>
      </div>
    </Link>
  );
}
