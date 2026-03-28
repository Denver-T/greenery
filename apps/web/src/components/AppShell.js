import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ title, children }) {
  return (
    <div className="grid min-h-screen grid-cols-[300px_1fr] bg-background text-foreground">
      <Sidebar />
      <div className="grid grid-rows-[76px_1fr] bg-transparent">
        <TopBar title={title} />
        <main role="main" className="px-8 py-7">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
