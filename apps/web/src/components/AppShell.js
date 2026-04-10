"use client";

import { useCallback, useState } from "react";

import MobileNavDrawer from "./MobileNavDrawer";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ title, children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[300px_1fr] bg-background text-foreground">
      <Sidebar />
      <div className="grid grid-rows-[64px_1fr] md:grid-rows-[76px_1fr] bg-transparent dark:bg-[linear-gradient(180deg,#20232a_0%,#191c22_100%)]">
        <TopBar
          title={title}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={toggleDrawer}
        />
        <main role="main" className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileNavDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
    </div>
  );
}
