import NavItem from "./NavItem";
import UserChip from "./UserChip";

const items = [
  { href: "/dashboard", label: "Dashboard Analytics", icon: "📊" },
  { href: "/req",       label: "REQ List",            icon: "📝" },
  { href: "/assigntasks", label: "Assign Tasks",    icon: "🧩" },
  { href: "/employees", label: "Manage Employees",    icon: "👥" },
  { href: "/calendar",  label: "View Calendar",       icon: "📅" },
  { href: "/tasks",     label: "View Tasks",          icon: "✅" },
  { href: "/inventory",     label: "View Inventory",          icon: "📦" },

];

export default function Sidebar() {
  return (
    <aside
      aria-label="Primary navigation"
      className="bg-gradient-to-b from-[#6a8f41] to-[#4f6c2d] text-white p-4 shadow-soft"
    >
      <UserChip name="User Name" />
      <nav className="mt-4 grid gap-2">
        {items.map((it) => (
          <NavItem key={it.href} {...it} />
        ))}
      </nav>
    </aside>
  );
}