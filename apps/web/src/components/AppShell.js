import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ title, children }) {
  return (
    <div className="app-shell grid min-h-screen lg:grid-cols-[280px_1fr]">
      <Sidebar />

      <div className="grid min-w-0 grid-rows-[72px_1fr]">
        <TopBar title={title} />
        <main role="main" className="min-w-0 px-4 pb-6 pt-4 md:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
