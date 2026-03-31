 "use client";

import { useEffect, useMemo, useState } from "react";
import NavItem from "./NavItem";
import UserChip from "./UserChip";
import { fetchApi } from "@/lib/api/api";

const baseSections = [
  {
    title: "Requests",
    items: [
      { href: "/tasks", label: "Request Queue", description: "Review, edit, delete, and recover requests" },
      { href: "/req", label: "New Request", description: "Create and submit a new work request" },
    ],
  },
  {
    title: "Scheduling",
    items: [
      { href: "/assigntasks", label: "Assignments", description: "Match open work to employees and due dates" },
      { href: "/calendar", label: "Schedule Board", description: "See the calendar and daily workload" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Overview", description: "Track workload, coverage, and activity" },
      { href: "/employees", label: "Team", description: "Manage employees and staffing details" },
      { href: "/inventory", label: "Inventory", description: "Review tracked plants and plant-heavy work" },
    ],
  },
];

export default function Sidebar() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const user = await fetchApi("/auth/me", { cache: "no-store" });

        if (!cancelled) {
          setCurrentUser(user);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    const resolvedSections = baseSections.map((section) => ({
      ...section,
      items: [...section.items],
    }));

    if (currentUser?.permissionLevel === "SuperAdmin") {
      const operationsSection = resolvedSections.find(
        (section) => section.title === "Operations"
      );

      operationsSection?.items.push({
        href: "/superadmin",
        label: "Super Admin",
        description: "Review audit logs and govern admin access",
      });
    }

    return resolvedSections;
  }, [currentUser]);

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex md:flex-col border-r border-white/10 bg-[linear-gradient(180deg,#294733_0%,#1f3427_100%)] p-5 text-white shadow-soft"
    >
      <div className="rounded-[22px] border border-white/10 bg-white/6 p-4 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
          Greenery Ops
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
          Control Center
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/72">
          Field work, staffing, and schedule visibility in one place.
        </p>
      </div>
      <UserChip name="Greenery Team" />
      <nav className="mt-5 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              {section.title}
            </div>
            <div className="grid gap-2">
              {section.items.map((it) => (
                <NavItem key={it.href} {...it} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
