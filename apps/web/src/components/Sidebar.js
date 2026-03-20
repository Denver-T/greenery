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
      className="mx-4 mb-4 mt-4 rounded-[28px] bg-[linear-gradient(180deg,rgba(79,108,45,0.98),rgba(50,72,29,0.96))] p-4 text-white shadow-elevated lg:sticky lg:top-4 lg:mb-4 lg:mr-0 lg:h-[calc(100vh-2rem)]"
    >
      <UserChip name="User Name" />
      <nav className="mt-5 grid gap-2">
        {items.map((it) => (
          <NavItem key={it.href} {...it} />
        ))}
      </nav>
    </aside>
  );
}
