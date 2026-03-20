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
      className="grid grid-cols-[40px_1fr] items-center gap-3 rounded-[10px] bg-white/15 px-3 py-2 hover:bg-white/25 transition"
      aria-label="Open profile"
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#4f6c2d] font-bold">
        {initial}
      </div>
      <div className="leading-tight">
        <div className="font-bold">{displayName}</div>
        <div className="text-xs opacity-90">{formatRole(account?.permissionLevel || account?.role)}</div>
      </div>
    </Link>
  );
}
