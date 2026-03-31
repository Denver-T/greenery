"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "greenery-theme";

function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const resolvedTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-border-soft bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted transition hover:bg-surface-muted dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
