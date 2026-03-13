import NavItem from "./NavItem";
import UserChip from "./UserChip";

const items = [
  { href: "/dashboard", label: "Dashboard Analytics"},
  { href: "/req",       label: "REQ List"},
  { href: "/assigntasks", label: "Assign Tasks"},
  { href: "/employees", label: "Manage Employees"},
  { href: "/calendar",  label: "View Calendar"},
  { href: "/tasks",     label: "View Tasks"},
  { href: "/inventory",     label: "View Inventory"},

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