"use client";

import { useEffect } from "react";

import Sidebar from "./Sidebar";

export default function MobileNavDrawer({ isOpen, onClose }) {
  // Escape closes the drawer.
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleEsc(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Body scroll lock with capture/restore — never hardcode "auto" on cleanup.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Auto-close when viewport crosses up to md+. Without this, md:hidden hides
  // the drawer visually but the body scroll lock above stays applied.
  useEffect(() => {
    if (!isOpen) return undefined;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mq = window.matchMedia("(min-width: 768px)");

    function handleChange(event) {
      if (event.matches) {
        onClose();
      }
    }

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [isOpen, onClose]);

  return (
    <div
      data-testid="mobile-nav-drawer-root"
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[90] md:hidden ${
        isOpen ? "" : "pointer-events-none"
      }`}
    >
      <div
        data-testid="mobile-nav-backdrop"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar inDrawer onNavigate={onClose} />
      </div>
    </div>
  );
}
