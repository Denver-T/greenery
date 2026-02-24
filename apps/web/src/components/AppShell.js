import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ title, children }) {
  return (
    <div className="grid min-h-screen grid-cols-[280px_1fr] bg-background text-foreground">
      {/* Left column */}
      <Sidebar />

      {/* Right column */}
      <div className="grid grid-rows-[64px_1fr] bg-background">
        <TopBar title={title} />
        <main role="main" className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}