export const ROUTES = [
  { href: "/dashboard",   topBarTitle: "Dashboard Analytics",   sidebarLabel: "Overview" },
  { href: "/tasks",       topBarTitle: "View Tasks",            sidebarLabel: "Request Queue" },
  { href: "/req",         topBarTitle: "Create Work REQ",       sidebarLabel: "New Request" },
  { href: "/calendar",    topBarTitle: "View Calendar",         sidebarLabel: "Schedule Board" },
  { href: "/assigntasks", topBarTitle: "Assign Tasks",          sidebarLabel: "Assignments" },
  { href: "/employees",   topBarTitle: "Manage Employees",      sidebarLabel: "Team" },
  { href: "/inventory",   topBarTitle: "Inventory",             sidebarLabel: "Inventory" },
  { href: "/profile",     topBarTitle: "Profile",               sidebarLabel: "Profile" },
  { href: "/superadmin",  topBarTitle: "Super Admin Workspace", sidebarLabel: "Super Admin" },
];

const TOP_BAR_TITLE_FALLBACK = "Greenery";

export function getTopBarTitle(pathname) {
  if (!pathname) return TOP_BAR_TITLE_FALLBACK;
  // The "+ '/'" suffix is load-bearing: it prevents prefix collisions like
  // /req matching /reqs. Do NOT simplify to pathname.startsWith(route.href).
  const match = ROUTES.find(
    (route) => pathname === route.href || pathname.startsWith(route.href + "/"),
  );
  return match ? match.topBarTitle : TOP_BAR_TITLE_FALLBACK;
}
