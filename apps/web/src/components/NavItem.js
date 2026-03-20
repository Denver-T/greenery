"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem({ href, label, icon }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-2 rounded-[16px] px-3 py-3 no-underline text-white shadow-elevated border border-white/10",
        active
          ? "bg-white/22 shadow-elevated-lg"
          : "bg-white/8 hover:bg-white/14 hover:shadow-elevated-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
      ].join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="font-semibold">{label}</span>
    </Link>
  );
}
