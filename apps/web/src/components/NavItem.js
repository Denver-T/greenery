"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem({ href, label, description, icon, onClick }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        // layout
        "flex items-center gap-2 rounded-[12px] px-3 py-2 no-underline",

        // color
        "text-white",

        // base elevation & subtle border to lift from the green background
        "shadow-elevated border border-white/10",

        // state styles
        active
          ? "bg-white/20 shadow-elevated-lg"
          : "bg-white/10 hover:bg-white/14 hover:shadow-elevated-lg",

        // focus ring (keyboard)
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
      ].join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-white/65">
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
