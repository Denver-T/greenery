"use client";

import { usePathname } from "next/navigation";

import AppShell from "@/components/AppShell";
import { getTopBarTitle } from "@/lib/routes";

export default function AppGroupLayout({ children }) {
  const pathname = usePathname();
  const title = getTopBarTitle(pathname);
  return <AppShell title={title}>{children}</AppShell>;
}
